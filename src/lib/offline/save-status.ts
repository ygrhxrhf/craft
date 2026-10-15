/**
 * `gap.md` G36 —— 保存状态的离线语义（官方 `interactions.md:71` 那张状态机表）：
 *   保存 | 脏 → 「所有更改已保存」；离线 → 「未连接到网络 / 离线不可用」；
 *   每日笔记离线态 → 「离线更新于 [0]」。
 *
 * 官方逐字（`_harvest/i18n-zh.tsv`）：
 *   `alert.all.changes.saved`＝所有更改已保存（:40）／`alert.not.connected.to.internet`＝未连接到网络（:201）
 *   ／`alert.not.available.offline`＝离线不可用（:200）／`daily.updated.offline.x`＝离线更新于 [0]（:1699）。
 *
 * ☆ 本仓只做**离线那半边**：在线时的徽标文案保持原样（「已保存」），因为改它会动视觉基线
 *   与 50 处 e2e 断言，属于另一批的范围；离线态此前**完全没有**，这才是 G36 记的那条"界面不显示"。
 * ☆ 「离线禁用表情」那半边早已落地（`comments/offline-reaction.ts`）；「离线禁用评论」本仓**有意不做**
 *   ——离线优先内核（红线）让评论写入在断链时也留得住，这是本仓的架构选择，不照抄官方门禁。
 */

export const ALL_CHANGES_SAVED = '所有更改已保存';
export const NOT_CONNECTED_TO_INTERNET = '未连接到网络';
export const NOT_AVAILABLE_OFFLINE = '离线不可用';

/** `[0]` 是时间。 */
export const OFFLINE_UPDATED_TEMPLATE = '离线更新于 [0]';

/** 把时刻格式化成官方那句里 `[0]` 的样子（本机时区的 `HH:MM`）。 */
export function formatOfflineStamp(at: number): string {
  const date = new Date(at);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * 离线时徽标该写什么：
 * - 每日笔记且拿得到草稿落盘时刻 ⇒ 「离线更新于 HH:MM」（官方给每日笔记的显式离线标记）；
 * - 其余离线 ⇒ 「未连接到网络」。
 * ☆ 返回 `null`＝**不该改徽标**（调用方保持它自己的在线态文案）。
 */
export function offlineSaveLabel(opts: {
  offline: boolean;
  isDailyNote: boolean;
  draftSavedAt: number | null;
}): string | null {
  if (!opts.offline) return null;
  if (opts.isDailyNote && opts.draftSavedAt !== null) {
    return OFFLINE_UPDATED_TEMPLATE.replace('[0]', formatOfflineStamp(opts.draftSavedAt));
  }
  return NOT_CONNECTED_TO_INTERNET;
}
