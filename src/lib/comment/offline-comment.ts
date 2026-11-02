/**
 * G1609 —— 离线时的评论是「**入口照开、提交才拦**」，不是"点入口就弹提示"。
 *
 * 官方那次实测（第 391／412 批）：CDP 真断网下选中正文按 `Ctrl-Shift-M`，官方**照样弹出评论面板**
 * （`popup-backdrop` 0→1、正文出现「输入你的评论」），**全程没有任何 alert**；门禁在**提交**那一步。
 * 提交被拦时那句逐字取自 `_harvest/i18n-zh.tsv:226`：
 *   `alert.reconnect.to.the.internet.to.comment`「重新连接网络以添加评论」。
 *
 * 本模块只给"哪一步拦、拦时说哪句"，与表情那支（`offline-reaction.ts`，G36）同一口径——
 * 本地两处都拒绝，行为一致。
 */

export const RECONNECT_TO_COMMENT_KEY = 'alert.reconnect.to.the.internet.to.comment';
export const RECONNECT_TO_COMMENT = '重新连接网络以添加评论';

/** 提交评论/回复被拦的那句（离线时）。 */
export function offlineCommentMessage(): string {
  return RECONNECT_TO_COMMENT;
}

/**
 * 入口该不该开：**永远开**。官方离线时照常弹面板，所以这里恒 `true`；
 * 写成函数是为了让调用点显式表达"这道门不在入口"，而不是默默什么都不写。
 */
export function commentEntryAllowed(): boolean {
  return true;
}

/** 提交该不该放行：在线才放（离线 ⇒ 拦并说 `RECONNECT_TO_COMMENT`）。 */
export function commentSubmitAllowed(online: boolean): boolean {
  return online;
}
