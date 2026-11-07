/**
 * G187 —— 邀请去重：官方把"已是团队成员"与"有待处理的邀请"并成同一句判据。
 *
 * 这三句与会话无关，是**纯文案**；`isPendingInvite` 是**纯判据**。它们原先放在
 * `src/actions/space/space.ts` 里，但那是一个 `'use server'` 文件——Next 只允许它导出
 * async 函数，导出 `const`/同步函数会让整个模块解析失败（`(app)` 整组路由报
 * "Only async functions are allowed to be exported in a use server file"）。
 * 所以文案与判据挪到本模块，action 只保留 async 动作。
 */

/** 判据那句逐字（`team.md`）。 */
export const INVITE_ALREADY_MEMBER = '已是团队成员或有待处理的邀请';
/** `invite.already.member.title`／`.subtitle`：本地只收到判据那句逐字，标题沿用同一句，
 * 副标题是本地措辞（官方那两句的逐字文本尚未采集，不要当成官方句引用）。 */
export const INVITE_ALREADY_MEMBER_TITLE = INVITE_ALREADY_MEMBER;
export const INVITE_ALREADY_MEMBER_SUBTITLE = '这个邮箱已被邀请过这个空间，无需重复邀请。';

/** 有待处理的邀请＝成员行在、但还没有加入（`SpaceMember.joined` 为假）。 */
export function isPendingInvite(member: { joined?: boolean | null } | null): boolean {
  return Boolean(member) && member?.joined === false;
}
