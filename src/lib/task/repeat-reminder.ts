/**
 * G667 —— 建立重复时自动挂提醒，默认「当日 09:00」（官方 `repeat.reminder = {enabled:true,
 * dateOffset:540}`）。本地提醒是绝对时刻列，故把 event day 的 09:00 写进 `remindAt`；
 * 已有提醒则不覆盖。
 */

export const REPEAT_REMINDER_OFFSET_MINUTES = 540;

export function defaultReminderForRepeat(
  scheduleDate: string | null | undefined,
  remindAt: string | null | undefined,
): string | null {
  if (remindAt) return remindAt;
  if (!scheduleDate) return null;
  const date = new Date(scheduleDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}
