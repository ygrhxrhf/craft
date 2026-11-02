/**
 * G648 —— 提醒有**两条独立 UI**，形状不同、组件不同：
 *   ① **块级提醒**＝绝对时刻（本地 `remindAt`，已落）；
 *   ② **重复内提醒**＝`dateOffset`，相对排期日的**96 档**（15 分钟一档、覆盖 0–23:45），
 *      官方那支 `TasksRepeatConfigCustomPicker` 就是这个。
 *
 * ★ 两者是**两个不同的字段**，不是同一个字段的两种写法：绝对提醒说的是"哪天几点提醒我"，
 *   相对偏移说的是"排期日提前多久提醒我"。本模块把 96 档的词表与换算写成纯核。
 */

/** 一档＝15 分钟；96 档 ＝ 24 小时。 */
export const REMIND_OFFSET_STEP_MINUTES = 15;
export const REMIND_OFFSET_TIER_COUNT = 96;

/** 96 档的偏移分钟数（0, 15, 30 … 1425）。 */
export const REMIND_OFFSET_TIERS: readonly number[] = Array.from(
  { length: REMIND_OFFSET_TIER_COUNT },
  (_, index) => index * REMIND_OFFSET_STEP_MINUTES,
);

/**
 * 一档的显示词：`0` → 「准时」；整小时 → 「提前 3 小时」；其余 → 「提前 1 小时 15 分钟」。
 * 负数/越界一律当作 0（「准时」），不发明档位。
 */
export function remindOffsetLabel(minutes: number): string {
  const safe = Number.isFinite(minutes) && minutes > 0 ? Math.trunc(minutes) : 0;
  if (safe === 0) return '准时';
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours > 0 && rest > 0) return `提前 ${hours} 小时 ${rest} 分钟`;
  if (hours > 0) return `提前 ${hours} 小时`;
  return `提前 ${rest} 分钟`;
}

/**
 * 由排期日与偏移算出绝对提醒时刻。`dateOffset` 那一路最终仍落成 `remindAt` ——
 * 两条 UI 的**输入不同**，但投递侧只需要一个绝对时刻。
 */
export function remindAtFromOffset(scheduleIso: string, minutes: number): string | null {
  const at = new Date(scheduleIso);
  if (Number.isNaN(at.getTime())) return null;
  const safe = Number.isFinite(minutes) && minutes > 0 ? Math.trunc(minutes) : 0;
  return new Date(at.getTime() - safe * 60_000).toISOString();
}

/** 当前偏移是不是那 96 档里的一档。 */
export function isRemindOffsetTier(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 0 && minutes < REMIND_OFFSET_TIER_COUNT * REMIND_OFFSET_STEP_MINUTES
    && minutes % REMIND_OFFSET_STEP_MINUTES === 0;
}
