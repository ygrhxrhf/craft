/**
 * G228 —— 邀请**非团队成员**＝访客，官方把它做成**带后果句的确认框**（`team.md`）。
 *
 * 原文逐字取自 `_harvest/i18n-zh.tsv:1890`：
 *   `guest.warning.desc`「你确定吗？你即将邀请一位非团队成员的用户。访客可以访问整个空间并更新任何文档。」
 *
 * ⇒ 权限模型有**第四轴：团队内 vs 非成员访客**——访客不只是"能看"，而是"可访问整个空间并更新
 * **任何**文档"。本地没有团队实体（G421），所以这条警告在本地是**文案与判据**，不是可执行的授权变更。
 */

export const GUEST_WARNING_KEY = 'guest.warning.desc';
export const GUEST_WARNING_DESC = '你确定吗？你即将邀请一位非团队成员的用户。访客可以访问整个空间并更新任何文档。';

export type InviteeKind = 'teamMember' | 'guest';

/**
 * 邀请某人的后果确认：非团队成员（访客）⇒ 出确认框；团队成员 ⇒ 不出（官方只在越出团队时拦）。
 * 这个判据是 G228 的核：**"是否非成员"决定要不要拦**，而不是"是否有权限"。
 */
export function needsGuestWarning(invitee: InviteeKind): boolean {
  return invitee === 'guest';
}

/** 确认框的动作按钮文案（官方那支的肯定句）。 */
export const GUEST_WARNING_CONFIRM = '邀请';
