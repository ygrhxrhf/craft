/**
 * G324 —— **空间级权限是 owner / member 两档 + 访客**，与文档级是**两套独立权限轴**
 * （`collab.md` §六之二 A）。
 *
 * 官方两条说明把边界说得很窄：
 *   - `permission.owner.description`「可以更改设置并邀请新成员」；
 *   - `permission.member.description`「**无法更改设置或邀请新成员**」。
 * 于是空间级就管两件事——**改设置**与**邀成员**——文档的看／评／编不在这里（那是文档级三键，
 * 见 `permission-axes.ts`）。本地此前把两轴并成一套 editor/viewer，`member` 与 `owner` 在
 * 空间面无从区分。
 */

export type SpaceRole = 'owner' | 'member' | 'guest';

export interface SpaceCapabilities {
  /** 改空间设置。 */
  canChangeSettings: boolean;
  /** 邀请新成员。 */
  canInviteMembers: boolean;
}

/**
 * 空间角色 → 两个能力。owner 两项皆真；member 与 guest 皆假——这正是官方那句
 * 「无法更改设置或邀请新成员」。
 */
export function spaceCapabilitiesFor(role: SpaceRole | null | undefined): SpaceCapabilities {
  if (role === 'owner') return { canChangeSettings: true, canInviteMembers: true };
  return { canChangeSettings: false, canInviteMembers: false };
}

/**
 * 官方两条角色说明，逐字取自 `_harvest/i18n-zh.tsv:977,979`（`collab.space.permission.member.description`
 * 与 `…owner.description`）。访客那一档官方语言包里**只有名字没有说明**（`:975` 只有「访客」），
 * 所以 guest 的说明是本地词，不是采集值。
 */
export const SPACE_ROLE_DESCRIPTIONS: Record<SpaceRole, string> = {
  owner: '可以更改设置并邀请新成员',
  member: '无法更改设置或邀请新成员',
  guest: '只能访问被分享的内容',
};

/**
 * 两轴**互不推导**：空间 owner 不等于某篇文档的编辑权，文档编辑者也不因此获得空间设置权。
 * 这个函数只把两轴摆在一起，好让调用点显式地分别判断，而不是用一个布尔糊过去。
 */
export interface TwoAxisPermission {
  space: SpaceRole | null | undefined;
  document: 'owner' | 'editor' | 'commenter' | 'viewer' | null | undefined;
}

export function spaceCapabilities(permission: TwoAxisPermission): SpaceCapabilities {
  return spaceCapabilitiesFor(permission.space);
}
