import { config } from 'dotenv';

// The actions write through the real ORM, so vitest needs the same .env Next loads at runtime.
config();

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));
vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const {
  getSpaceContext,
  setSpaceName,
  inviteSpaceMember,
  guestWarningFor,
  getTeamContext,
  createTeam,
  changeTeamRole,
} = await import('./space');

let db: Awaited<ReturnType<typeof getDb>>;
let ownerId = '';
let otherId = '';
let otherEmail = '';

beforeAll(async () => {
  db = await getDb();
  ownerId = crypto.randomUUID();
  otherId = crypto.randomUUID();
  otherEmail = `g324-other-${otherId.slice(0, 8)}@example.com`;
  for (const [id, email] of [[ownerId, `g324-owner-${ownerId.slice(0, 8)}@example.com`], [otherId, otherEmail]] as const) {
    await db.orm.public.User.create({
      id,
      email,
      name: '空间团队测试账号',
      // Not a credential: these rows never log in, the session is mocked above.
      password: '!no-login-test-row',
    });
  }
});

afterAll(async () => {
  for (const id of [ownerId, otherId]) {
    const spaces = await db.orm.public.Space.where({ ownerId: id }).all();
    for (const s of spaces) await db.orm.public.Space.where({ id: String((s as any).id) }).delete();
    const members = await db.orm.public.SpaceMember.where({ userId: id }).all();
    for (const m of members) await db.orm.public.SpaceMember.where({ id: String((m as any).id) }).delete();
    const teams = await db.orm.public.Team.where({ ownerId: id }).all();
    for (const t of teams) await db.orm.public.Team.where({ id: String((t as any).id) }).delete();
    const tms = await db.orm.public.TeamMember.where({ userId: id }).all();
    for (const m of tms) await db.orm.public.TeamMember.where({ id: String((m as any).id) }).delete();
    await db.orm.public.User.where({ id }).delete();
  }
});

describe('space context (G324)', () => {
  it('creates a personal space on first read and reports owner capabilities', async () => {
    session.userId = ownerId;
    const space = await getSpaceContext();
    expect(space.role).toBe('owner');
    expect(space.capabilities).toEqual({ canChangeSettings: true, canInviteMembers: true });
    // 官方那句 owner 说明逐字。
    expect(space.roleDescription).toBe('可以更改设置并邀请新成员');
    expect(space.teamId).toBeNull();
  });

  it('renames the space (owner can change settings)', async () => {
    session.userId = ownerId;
    const renamed = await setSpaceName('我的工作空间');
    expect(renamed.name).toBe('我的工作空间');
  });

  it('G228: inviting a non-member yields the guest warning', async () => {
    session.userId = ownerId;
    expect(await guestWarningFor(otherEmail)).toBe(true);
  });

  it('G228: after the invite the same user is no longer a guest', async () => {
    session.userId = ownerId;
    await inviteSpaceMember({ email: otherEmail, role: 'guest' });
    expect(await guestWarningFor(otherEmail)).toBe(false);
  });

  it('G324: an invited member has no settings/invite capability', async () => {
    session.userId = otherId;
    const space = await getSpaceContext();
    // 被邀者不是所有者，角色是 guest（本用例给的档）。
    expect(space.capabilities).toEqual({ canChangeSettings: false, canInviteMembers: false });
    await expect(setSpaceName('偷改')).rejects.toThrow('没有更改空间设置的权限');
  });
});

describe('team context (G421)', () => {
  it('createTeam makes the caller the sole admin', async () => {
    session.userId = ownerId;
    const team = await createTeam('研发团队');
    expect(team.admins).toEqual([ownerId]);
    expect(team.members[0]).toMatchObject({ userId: ownerId, role: 'admin' });
    // 两档说明逐字。
    expect(team.members[0].subtitle).toBe('可以更改团队设置、账单明细并查看所有空间。');
  });

  it('G421: admins can be plural — a second admin does not displace the first', async () => {
    session.userId = ownerId;
    const team = await getTeamContext();
    // 手工把第二位加成 admin（邀请路径本批只服务空间，团队邀请另说）。
    await db.orm.public.TeamMember.create({
      id: crypto.randomUUID(),
      teamId: team!.id,
      userId: otherId,
      role: 'member',
      state: 'active',
    });
    const after = await changeTeamRole(otherId, 'admin');
    expect(after.admins.sort()).toEqual([ownerId, otherId].sort());
  });

  it('G421: changeMemberRole is per-member — the other admin is untouched', async () => {
    session.userId = ownerId;
    const team = await getTeamContext();
    const after = await changeTeamRole(otherId, 'member');
    expect(after.admins).toEqual([ownerId]);
    expect(after.members.find((m) => m.userId === otherId)?.role).toBe('member');
  });

  it('refuses a non-admin trying to change roles', async () => {
    session.userId = otherId;
    await expect(changeTeamRole(ownerId, 'member')).rejects.toThrow('只有管理员可以改成员角色');
  });
});
