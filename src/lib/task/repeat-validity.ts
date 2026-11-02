/**
 * G646 —— 重复面板的提交门控是**四档合法性真值表**（`tasks.md`，官方 @5448520）。
 *
 * 官方那四条判据，逐条读出来是：
 *   - `weekly` 要 `days.length > 0`（一周里至少点一天）；
 *   - `monthly` 要 `days` 与 `dynamicDays` **至少其一非空**（判据用 `&&`——即"两者都空才不合法"）；
 *   - `yearly` 要 `days` 与 `months` **都非空**（判据用 `||`——即"任一为空就不合法"）；
 *   - `daily` 与 `flexible` **恒真**（这两档没有需要填的子项）。
 *
 * ★ 两档不对称是官方自己写歪的地方（monthly 用 `&&`、yearly 用 `||`），照抄，不"修正"。
 * 本地此前**无字段级校验、无禁用态**（重复只是原生 `<select>` 四选一）⇒ 选完每月/每年而没选
 * 具体日子也能提交，与官方相反。
 */

import { serializeWeekdays } from './recurrence';

export type RepeatFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RepeatDraft {
  freq: RepeatFrequency;
  /** 一周里的哪几天（0=周日 … 6=周六）。weekly 必填。 */
  days: readonly number[];
  /** monthly 的"动态日"（如"最后一个工作日"之类）——与 `days` 至少其一非空。 */
  dynamicDays?: readonly number[];
  /** yearly 的月份。与 `days` 都必须非空。 */
  months?: readonly number[];
  /** 本地月档的承载列（`recurrence.byMonthDay`）：算作"填了具体日子"，与 `days` 同权。 */
  byMonthDay?: number | null;
}

/**
 * 这一档现在能不能提交。`true` ＝合法（提交按钮可用）。
 * 逐档照官方那四条判据；未知档位一律不合法（不猜）。
 */
export function repeatDraftValid(draft: RepeatDraft): boolean {
  switch (draft.freq) {
    case 'daily':
      return true;
    case 'weekly':
      return draft.days.length > 0;
    case 'monthly':
      // 官方用 `&&`：`days` 与 `dynamicDays` **都空**才不合法。本地月档的承载列是
      // `byMonthDay`（"每月 N 日"），它与 `days` 同权 ⇒ 三者全空才不合法。
      return draft.days.length > 0 || (draft.dynamicDays?.length ?? 0) > 0 || draft.byMonthDay != null;
    case 'yearly':
      // 官方用 `||`：`days` 与 `months` **任一为空**不合法（故两者都必须非空）。
      return draft.days.length > 0 && (draft.months?.length ?? 0) > 0;
    default:
      return false;
  }
}

/** `flexible`（相对于完成）恒真：它没有需要填的子项。 */
export function flexibleDraftValid(): boolean {
  return true;
}

/**
 * G646 —— 选一档时**就地补足最小合法子项**，于是构造出来的规则恒过真值表。
 * 这比"选完再让提交按钮灰着"更贴近官方那份面板的实际手感：官方选「每周」会自带当天，
 * 选「每月」自带今天的日号，选「每年」自带今天的月与日。
 *
 * 返回写进 `recurrence` 列的 JSON 串（与既有格式一致：`{freq, days?, byMonthDay?}`）。
 */
export function repeatRuleFor(freq: RepeatFrequency, today: Date): string {
  const weekday = today.getDay(); // 0=周日 … 6=周六
  const dayOfMonth = today.getDate();
  const month = today.getMonth() + 1; // 1–12
  switch (freq) {
    case 'daily':
      // G668: rules always carry an explicit anchor; absent means fixed on the official write side.
      return JSON.stringify({ freq: 'daily', type: 'fixed' });
    case 'weekly':
      // G405：weekly 的 `days` 写成官方形（星期名），读侧两种形都收。
      return JSON.stringify({ freq: 'weekly', type: 'fixed', days: serializeWeekdays([weekday]) });
    case 'monthly':
      return JSON.stringify({ freq: 'monthly', type: 'fixed', byMonthDay: dayOfMonth });
    case 'yearly':
      // 年档在本地承载为"每年 + 月 + 日"：`byMonthDay` 带日，`days` 位放月号（0–11 不用，
      // 这里用 1–12 的月号），与 G646 的"days 与 months 都非空"同形。
      return JSON.stringify({ freq: 'yearly', type: 'fixed', days: [dayOfMonth], months: [month] });
  }
}
