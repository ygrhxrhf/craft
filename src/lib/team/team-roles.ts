/**
 * G421 —— 团队权限只有**两档且管理员可多人**（`team.md` §六之三 1）。
 *
 * 官方 `role.{admin,member,deactivated,pending}` 里，**admin/member 是权限档、
 * deactivated/pending 是生命周期态**；切换是**逐成员**动作，两档的说明逐字取自
 * `_harvest/i18n-zh.tsv:3614-3617`：
 *   - admin：「可以更改团队设置、账单明细并查看所有空间。」
 *   - member：「无法查看设置、账单以及未加入的空间。」
 * ⇒ **成员可见空间由"是否已加入"决定**（不是靠角色）。
 *
 * 本地无团队实体，唯一的角色是文档级三档。本模块给出团队层的两档 + 两个生命周期态的形状。
 */

/** 权限档：只有两档。 */
export type TeamPermissionRole = 'admin' | 'member';

/** 生命周期态：与权限档**不同轴**。 */
export type TeamLifecycleState = 'active' | 'deactivated' | 'pending';

export interface TeamMember {
  userId: string;
  /** 权限档（admin 可多人）。 */
  role: TeamPermissionRole;
  /** 生命周期态。 */
  state: TeamLifecycleState;
}

export const TEAM_PERMISSION_ROLES: readonly TeamPermissionRole[] = ['admin', 'member'];

/** 两档的说明与标题，逐字取自 harvest。 */
export const TEAM_ROLE_COPY: Record<TeamPermissionRole, { titleKey: string; title: string; subtitleKey: string; subtitle: string }> = {
  admin: {
    titleKey: 'teamsettings.team.change.to.admin.title',
    title: '管理员',
    subtitleKey: 'teamsettings.team.change.to.admin.subtitle',
    subtitle: '可以更改团队设置、账单明细并查看所有空间。',
  },
  member: {
    titleKey: 'teamsettings.team.change.to.member.title',
    title: '成员',
    subtitleKey: 'teamsettings.team.change.to.member.subtitle',
    subtitle: '无法查看设置、账单以及未加入的空间。',
  },
};

/** 生命周期态的四个名字（逐字）。 */
export const TEAM_ROLE_LABELS: Record<'admin' | 'member' | 'deactivated' | 'pending', string> = {
  admin: '管理员',
  member: '成员',
  deactivated: '停用',
  pending: '待定',
};

/** 管理员**可以多人**——判据不是"恰好一个"，而是"至少一个"。 */
export function adminsOf(members: TeamMember[]): TeamMember[] {
  return members.filter((member) => member.role === 'admin');
}

export function hasAdmin(members: TeamMember[]): boolean {
  return adminsOf(members).length > 0;
}

/** 逐成员改档：只改目标那一位，其余不动（"逐成员"而非批量）。 */
export function changeMemberRole(members: TeamMember[], userId: string, role: TeamPermissionRole): TeamMember[] {
  return members.map((member) => (member.userId === userId ? { ...member, role } : member));
}

/**
 * 成员能看见的空间由**是否已加入**决定，与角色无关——这条判据把"member 看不到未加入的空间"
 * 那句落到实处：`joined` 为假即看不见，无论他是 admin 还是 member。
 */
export function canSeeSpace(joined: boolean): boolean {
  return joined;
}
