/**
 * `gap.md` G85 —— 移除某人权限前的**解释性提示**（官方 `dialogs.md:28-40`「权限守卫」一层）。
 *
 * 官方那三句说明权限是**多路叠加**的（个人条目之外还有链接档与团队档）：
 *   链接仍是 edit ⇒ `alert.member.can.edit.doc.file.permission`
 *     「此人仍然可以编辑，因为该文件设置为任何有链接的人都可以编辑。」
 *   团队有编辑权 ⇒ `alert.member.can.edit.doc.team.permission`
 *     「此人仍然可以编辑，因为他们在文档所在团队中拥有编辑权限。」
 *   团队仍可见   ⇒ `alert.member.will.still.access.doc`
 *     「此人仍然能够访问该文档，因为他们是该文档所在团队的成员。」
 * 逐字取自 `_harvest/i18n-zh.tsv:192-194`。
 *
 * ☆ 本仓**没有团队模型**（无 team 表、无 team 级授权）⇒ 后两句**不适用**，本模块只落第一句
 *   （链接档那一半）——这正是 G85 里唯一"本地有对应数据"的一档（`document_share.permission`）。
 */

export const MEMBER_CAN_EDIT_BY_LINK = '此人仍然可以编辑，因为该文件设置为任何有链接的人都可以编辑。';
export const MEMBER_CAN_EDIT_BY_LINK_KEY = 'alert.member.can.edit.doc.file.permission';

/** 团队那两档的原文（本仓无团队模型，登记备查、不渲染）。 */
export const MEMBER_CAN_EDIT_BY_TEAM = '此人仍然可以编辑，因为他们在文档所在团队中拥有编辑权限。';
export const MEMBER_CAN_EDIT_BY_TEAM_KEY = 'alert.member.can.edit.doc.team.permission';
export const MEMBER_WILL_STILL_ACCESS = '此人仍然能够访问该文档，因为他们是该文档所在团队的成员。';
export const MEMBER_WILL_STILL_ACCESS_KEY = 'alert.member.will.still.access.doc';

/**
 * 移除某人前该给的解释句；没有适用的一句时返回 `null`（＝照常移除、不打扰）。
 * ☆ 只有**链接档是 edit** 时才解释：view 档下移除个人条目确实收回了编辑权，没有误导风险。
 */
export function memberRemovalNote(linkPermission: unknown): string | null {
  return linkPermission === 'edit' ? MEMBER_CAN_EDIT_BY_LINK : null;
}
