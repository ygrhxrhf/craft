'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import {
  spaceCapabilitiesFor,
  SPACE_ROLE_DESCRIPTIONS,
  type SpaceRole,
} from '@/lib/authz/space-role';
import {
  adminsOf,
  changeMemberRole,
  TEAM_PERMISSION_ROLES,
  TEAM_ROLE_COPY,
  type TeamPermissionRole,
} from '@/lib/team/team-roles';
import { needsGuestWarning } from '@/lib/share/guest-warning';
import { INVITE_ALREADY_MEMBER } from '@/lib/share/invite-duplicate';
import { resolveScopedSetting, scopeOfSetting, type SettingsScope } from '@/lib/app/settings-scope';
import {
  nextDomainState,
  tierEmailConflict,
  type DnsRecord,
  type DomainState,
  type DomainTier,
} from '@/lib/share/domain-lifecycle';

/* eslint-disable @typescript-eslint/no-explicit-any */
// 过滤回调收到的是 emitted types 没有命名的列代理。

export interface SpaceSummary {
  id: string;
  name: string;
  icon: string | null;
  /** G324：调用者在这个空间里的角色。 */
  role: SpaceRole;
  /** G324：角色给的两个能力（改设置／邀成员）。 */
  capabilities: { canChangeSettings: boolean; canInviteMembers: boolean };
  /** G324：官方那句角色说明（逐字；guest 档是本地词）。 */
  roleDescription: string;
  /** G166：这个空间是否有团队（个人空间无团队 ⇒ 只有个人与空间两层）。 */
  teamId: string | null;
}

export interface TeamMemberRow {
  userId: string;
  name: string;
  role: TeamPermissionRole;
  state: string;
  /** G421：这一档的官方说明（逐字）。 */
  subtitle: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  /** G421：管理员**可以多人** ⇒ 这里给的是数组，不是单值。 */
  admins: string[];
  members: TeamMemberRow[];
}

/**
 * G324 —— 空间上下文：调用者的空间、他在空间里的角色、以及角色给的两个能力。
 * 没有空间时**就地建一个**（个人空间：owner=自己、无团队）——这正是官方"个人空间默认"那一层。
 */
export async function getSpaceContext(): Promise<SpaceSummary> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const userId = session.user.id;
  const db = await getDb();

  // G324：先看调用者是否**被邀进某个空间**（成员行），再看是不是某个空间的所有者。
  // 只看 ownerId 会把被邀者当成"没有空间"、给他新铸一个自己的空间，那正好把"空间级角色"
  // 这枚轴抹掉——被邀者在他的空间里应该是 guest/member，而不是另一个空间的 owner。
  const membership = await db.orm.public.SpaceMember.first({ userId });
  let space = membership
    ? await db.orm.public.Space.first({ id: String((membership as any).spaceId) })
    : await db.orm.public.Space.first({ ownerId: userId });
  if (!space) {
    const id = crypto.randomUUID();
    await db.orm.public.Space.create({ id, name: '我的空间', ownerId: userId });
    space = await db.orm.public.Space.first({ id });
  }
  const spaceId = String((space as any).id);
  const member = membership ?? (await db.orm.public.SpaceMember.first({ spaceId, userId }));
  const role: SpaceRole =
    (space as any).ownerId === userId
      ? 'owner'
      : member?.role === 'guest'
        ? 'guest'
        : member?.role === 'owner'
          ? 'owner'
          : 'member';

  return {
    id: spaceId,
    name: String((space as any).name ?? '我的空间'),
    icon: ((space as any).icon as string | null) ?? null,
    role,
    capabilities: spaceCapabilitiesFor(role),
    roleDescription: SPACE_ROLE_DESCRIPTIONS[role],
    teamId: ((space as any).teamId as string | null) ?? null,
  };
}

/**
 * G179 —— 空间图标：`Space.icon` 是真实列，存的是本地面板给出的预设 id（`gradient:*`）。
 * 与改名同一道门（`canChangeSettings`）；空串按"回到默认图标"处理。
 */
export async function setSpaceIcon(icon: string | null): Promise<SpaceSummary> {
  const context = await getSpaceContext();
  if (!context.capabilities.canChangeSettings) throw new Error('没有更改空间设置的权限');

  const userId = (await auth())!.user!.id;
  const db = await getDb();
  const next = icon?.trim() ? icon.trim() : null;
  await db.orm.public.Space.where({ id: context.id }).update({ icon: next });
  await emitSyncEventSafe(db, userId, ['space'], context.id);
  return getSpaceContext();
}

/** 空间改名（owner 才有能力；`capabilities.canChangeSettings` 就是这道门）。 */
export async function setSpaceName(name: string): Promise<SpaceSummary> {
  const context = await getSpaceContext();
  if (!context.capabilities.canChangeSettings) throw new Error('没有更改空间设置的权限');
  const trimmed = name.trim();
  if (!trimmed) throw new Error('空间名称不能为空');

  const userId = (await auth())!.user!.id;
  const db = await getDb();
  await db.orm.public.Space.where({ id: context.id }).update({ name: trimmed });
  await emitSyncEventSafe(db, userId, ['space'], context.id);
  return getSpaceContext();
}

/**
 * G228 —— 邀请一名成员进空间。**非成员＝访客**：角色给 guest、并在 UI 侧出后果确认框
 * （`needsGuestWarning` 判据在客户端调；服务端只按传入角色落库）。
 * G187：已有成员行（含待处理邀请）时以那句判据拒绝，不重复写行、也不顺手改档。
 */
export async function inviteSpaceMember(input: {
  email: string;
  role: SpaceRole;
}): Promise<SpaceSummary> {
  const context = await getSpaceContext();
  if (!context.capabilities.canInviteMembers) throw new Error('没有邀请新成员的权限');
  if (context.role !== 'owner' && input.role === 'owner') throw new Error('不能邀请第二个空间所有者');

  const db = await getDb();
  const target = await db.orm.public.User.first({ email: input.email.trim() });
  if (!target) throw new Error('找不到该用户');

  const existing = await db.orm.public.SpaceMember.first({
    spaceId: context.id,
    userId: String((target as any).id),
  });
  if (existing) throw new Error(INVITE_ALREADY_MEMBER);

  await db.orm.public.SpaceMember.create({
    id: crypto.randomUUID(),
    spaceId: context.id,
    userId: String((target as any).id),
    role: input.role,
    joined: true,
  });
  await emitSyncEventSafe(db, (await auth())!.user!.id, ['space_member'], context.id);
  return getSpaceContext();
}

/** G228：这名受邀者该不该出后果确认框（非成员＝访客 ⇒ 出）。 */
export async function guestWarningFor(email: string): Promise<boolean> {
  const context = await getSpaceContext();
  const db = await getDb();
  const target = await db.orm.public.User.first({ email: email.trim() });
  if (!target) return true; // 查不到就是非成员 ⇒ 按访客处理（保守）
  const member = await db.orm.public.SpaceMember.first({
    spaceId: context.id,
    userId: String((target as any).id),
  });
  return needsGuestWarning(member ? 'teamMember' : 'guest');
}

/**
 * G454：`person` 列的候选人＝空间成员（官方选择器同样从成员里挑）。只回快照需要的三格，
 * 前端用 `personSnapshot` 拼成 `{userId, profileImgUrl?, firstName?, lastName?}`。
 */
export async function getPersonCandidates(): Promise<
  Array<{ userId: string; name: string; image: string | null }>
> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const context = await getSpaceContext();
  const db = await getDb();

  const space = await db.orm.public.Space.first({ id: context.id });
  const members = (await db.orm.public.SpaceMember
    .where({ spaceId: context.id })
    .all()) as any[];
  // 空间所有者不一定是成员行（个人空间就没有 SpaceMember 记录）⇒ 把 ownerId 也并进来、去重。
  const userIds: string[] = [];
  const ownerId = (space as any)?.ownerId ? String((space as any).ownerId) : null;
  if (ownerId) userIds.push(ownerId);
  for (const member of members) {
    const id = String(member.userId);
    if (!userIds.includes(id)) userIds.push(id);
  }

  const rows: Array<{ userId: string; name: string; image: string | null }> = [];
  for (const userId of userIds) {
    const user = await db.orm.public.User.first({ id: userId });
    if (!user) continue;
    rows.push({
      userId: String((user as any).id),
      name: String((user as any).name ?? (user as any).email ?? ''),
      image: ((user as any).image as string | null) ?? null,
    });
  }
  return rows;
}

/**
 * G421 —— 团队上下文：两档权限（admin/member）＋生命周期态，管理员**可多人**。
 * 没有团队时就地建一个（调用者＝唯一管理员）。
 */
export async function getTeamContext(): Promise<TeamSummary | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const userId = session.user.id;
  const db = await getDb();

  const mine = await db.orm.public.TeamMember.first({ userId });
  let teamId = mine ? String((mine as any).teamId) : null;
  if (!teamId) {
    const owned = await db.orm.public.Team.first({ ownerId: userId });
    teamId = owned ? String((owned as any).id) : null;
  }
  if (!teamId) return null;

  const team = await db.orm.public.Team.first({ id: teamId });
  if (!team) return null;

  const rows: Record<string, unknown>[] = await db.orm.public.TeamMember
    .where({ teamId })
    .all();
  const members: TeamMemberRow[] = [];
  for (const row of rows) {
    const user = await db.orm.public.User.first({ id: String(row.userId) });
    const role: TeamPermissionRole = row.role === 'admin' ? 'admin' : 'member';
    members.push({
      userId: String(row.userId),
      name: String((user as any)?.name ?? (user as any)?.email ?? '成员'),
      role,
      state: String(row.state ?? 'active'),
      subtitle: TEAM_ROLE_COPY[role].subtitle,
    });
  }
  const admins = adminsOf(
    members.map((m) => ({ userId: m.userId, role: m.role, state: m.state as never })),
  ).map((m) => m.userId);

  return { id: teamId, name: String((team as any).name ?? '我的团队'), admins, members };
}

/** 建团队：调用者成为唯一管理员。 */
export async function createTeam(name: string): Promise<TeamSummary> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const userId = session.user.id;
  const trimmed = name.trim();
  if (!trimmed) throw new Error('团队名称不能为空');

  const db = await getDb();
  const existing = await db.orm.public.TeamMember.first({ userId });
  if (existing) throw new Error('你已在一个团队中');

  const teamId = crypto.randomUUID();
  await db.orm.public.Team.create({ id: teamId, name: trimmed, ownerId: userId });
  await db.orm.public.TeamMember.create({
    id: crypto.randomUUID(),
    teamId,
    userId,
    role: 'admin',
    state: 'active',
  });
  await emitSyncEventSafe(db, userId, ['team', 'team_member'], teamId);
  return (await getTeamContext())!;
}

/**
 * G421 —— 逐成员改档（不是批量）。只改目标那一位；`role` 只有两档。
 */
export async function changeTeamRole(targetUserId: string, role: TeamPermissionRole): Promise<TeamSummary> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  if (!TEAM_PERMISSION_ROLES.includes(role)) throw new Error('无效的团队角色');

  const team = await getTeamContext();
  if (!team) throw new Error('你不在任何团队中');
  const actor = team.members.find((m) => m.userId === session.user!.id);
  if (actor?.role !== 'admin') throw new Error('只有管理员可以改成员角色');

  const db = await getDb();
  const target = await db.orm.public.TeamMember.first({ teamId: team.id, userId: targetUserId });
  if (!target) throw new Error('该用户不在团队中');

  // 逐成员：只改这一行（`changeMemberRole` 的语义落到单行 update 上）。
  const next = changeMemberRole(
    [{ userId: targetUserId, role: target.role === 'admin' ? 'admin' : 'member', state: 'active' }],
    targetUserId,
    role,
  );
  await db.orm.public.TeamMember.where({ id: String((target as any).id) }).update({ role: next[0].role });
  await emitSyncEventSafe(db, session.user.id, ['team_member'], team.id);
  return (await getTeamContext())!;
}

/**
 * G166 —— 三层作用域取值：**空间覆盖 → 团队默认 → 个人默认**。三处都存在库里
 * （`Space.settings`／`Team.settings`／用户偏好表），于是"空间可覆盖"是真能读出来的，
 * 而不是一句说明。
 */
export async function resolveSettingWithScope(
  key: string,
): Promise<{ value: unknown; scope: SettingsScope | null }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const userId = session.user.id;
  const db = await getDb();

  const space = await db.orm.public.Space.first({ ownerId: userId });
  const teamId = space ? ((space as any).teamId as string | null) : null;
  const team = teamId ? await db.orm.public.Team.first({ id: teamId }) : null;

  const settings = {
    space: ((space as any)?.settings ?? undefined) as Record<string, unknown> | undefined,
    team: ((team as any)?.settings ?? undefined) as Record<string, unknown> | undefined,
    personal: undefined as Record<string, unknown> | undefined,
  };
  return { value: resolveScopedSetting(settings, key), scope: scopeOfSetting(settings, key) };
}

/* ---------- G183：自定义域名四态生命周期 ---------- */

export interface DomainContext {
  /** 当前域名（未设置时 null）。 */
  domain: string | null;
  /** 四态：unset / declared / verified / disconnected。 */
  state: DomainState;
  /** 域名档：defaultCraft / customCraft / external。 */
  tier: DomainTier;
  /** 外部域要展示的 DNS 记录（名称/主机、值/指向）。 */
  dnsRecords: DnsRecord[];
  /** 该档与邮箱访问是否冲突（外部域 × 邮箱访问）——冲突时面板把原因作文字附上。 */
  emailConflict: string | null;
}

async function requireTeam() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const db = await getDb();
  const team = await db.orm.public.Team.first({ ownerId: session.user.id });
  if (!team) throw new Error('请先创建团队');
  return { userId: session.user.id, db, team };
}

function domainOf(team: Record<string, unknown>): DomainContext {
  const tier = (team.domainTier as DomainTier) ?? 'defaultCraft';
  const state = (team.domainState as DomainState) ?? 'unset';
  return {
    domain: (team.domain as string | null) ?? null,
    state,
    tier,
    dnsRecords: Array.isArray(team.dnsRecords) ? (team.dnsRecords as DnsRecord[]) : [],
    emailConflict: tierEmailConflict(tier, false),
  };
}

/** G183：读当前域名与四态。 */
export async function getDomainContext(): Promise<DomainContext | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const db = await getDb();
  const team = await db.orm.public.Team.first({ ownerId: session.user.id });
  return team ? domainOf(team as Record<string, unknown>) : null;
}

/**
 * G183 —— 声明"我已添加 DNS 记录"：`unset`/`disconnected` → `declared`，并为外部域铸出那两行
 * DNS 记录（名称/主机、值/指向）。走 `nextDomainState` 的四态机。
 */
export async function declareDomain(input: {
  domain: string;
  tier: DomainTier;
}): Promise<DomainContext> {
  const { userId, db, team } = await requireTeam();
  const next = nextDomainState((team as any).domainState as DomainState, 'declare');
  const dnsRecords: DnsRecord[] =
    input.tier === 'external'
      ? [{ name: '@', value: `verify.craft.me/${crypto.randomUUID().slice(0, 8)}` }]
      : [];
  await db.orm.public.Team.where({ id: String((team as any).id) }).update({
    domain: input.domain.trim() || null,
    domainTier: input.tier,
    domainState: next,
    dnsRecords,
  });
  await emitSyncEventSafe(db, userId, ['team'], String((team as any).id));
  return domainOf({
    ...(team as Record<string, unknown>),
    domain: input.domain,
    domainTier: input.tier,
    domainState: next,
    dnsRecords,
  });
}

/** 验证探测落定：`declared` → `verified`（成功）或留在 `declared`（找不到配置）。 */
export async function resolveDomainVerification(ok: boolean): Promise<DomainContext> {
  const { userId, db, team } = await requireTeam();
  const next = nextDomainState((team as any).domainState as DomainState, ok ? 'verify-ok' : 'verify-fail');
  await db.orm.public.Team.where({ id: String((team as any).id) }).update({ domainState: next });
  await emitSyncEventSafe(db, userId, ['team'], String((team as any).id));
  return domainOf({ ...(team as Record<string, unknown>), domainState: next });
}

/**
 * G183 —— 断开：任意活态 → `disconnected`，域名回落 craft.me（`hostAfterDisconnect`）。
 * 换 Craft 域会让所有现有外链失效——那句后果在确认框里（客户端调）。
 */
export async function disconnectDomain(): Promise<DomainContext> {
  const { userId, db, team } = await requireTeam();
  const next = nextDomainState((team as any).domainState as DomainState, 'disconnect');
  await db.orm.public.Team.where({ id: String((team as any).id) }).update({
    domainState: next,
    domain: null,
    dnsRecords: [],
  });
  await emitSyncEventSafe(db, userId, ['team'], String((team as any).id));
  return domainOf({ ...(team as Record<string, unknown>), domainState: next, domain: null, dnsRecords: [] });
}
