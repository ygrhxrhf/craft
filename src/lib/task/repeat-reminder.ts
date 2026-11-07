/**
 * G667 —— 建立重复时自动挂提醒，默认「当日 09:00」（官方 `repeat.reminder = {enabled:true,
 * dateOffset:540}`）。本地提醒是绝对时刻列，故把 event day 的 09:00 写进 `remindAt`；
 * 已有提醒则不覆盖。
 */

import { wallClockOnDay } from './recurrence';

export const REPEAT_REMINDER_OFFSET_MINUTES = 540;

/**
 * G644: the reminder is an **expression**, not a stored absolute instant — "schedule day ＋
 * minute-of-day", recomputed on every roll. The official bridge recomputes it from the repeat's
 * `reminder.dateOffset` (`Lm(eventDate, offset)`); locally the same minute-of-day is carried by
 * the previous occurrence's `remindAt`, so the time of day rides along and the **date comes from
 * the new schedule**.
 *
 * The old writer kept the *lead* instead (`remindAt = upcoming − (dueDate − remindAt)`), which
 * throws the wall-clock anchor away: a 09:00 reminder on a 00:00 schedule stayed "9 h before",
 * not "09:00 that day". Two guards come from the same bridge:
 *   • a computed instant already in the past is **silently dropped** (no reminder is scheduled);
 *   • a computed instant equal to the previous one is **idempotent** — the stored string is
 *     handed back untouched, so a same-day roll writes nothing new.
 */
export function rollForwardReminder(
  previousRemindAt: string | null | undefined,
  upcomingDue: Date,
  timeZone = 'UTC',
  now: Date = new Date(),
): string | null {
  if (!previousRemindAt) return null;
  const previous = new Date(previousRemindAt);
  if (Number.isNaN(previous.getTime()) || Number.isNaN(upcomingDue.getTime())) return null;

  const at = wallClockOnDay(upcomingDue, previous, timeZone);
  if (at.getTime() <= now.getTime()) return null;
  if (at.getTime() === previous.getTime()) return previousRemindAt;
  return at.toISOString();
}

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
