/**
 * G647: changing a reminder flashes a 3-second info toast — title `reminders.reminder.changed`,
 * subtitle `reminders.next.reminder.time` with the resolved moment. The cancel branch uses the
 * same shape, so the subtitle formatter is shared.
 *
 * The moment is formatted the way the official subtitle reads it: a day-granularity label for
 * today/tomorrow plus a clock time, so "下次提醒时间" is legible without opening anything.
 */

export const REMINDER_CHANGED_TITLE = '已更改提醒';
export const NEXT_REMINDER_TIME_KEY = 'reminders.next.reminder.time';
export const REMINDER_CHANGED_KEY = 'reminders.reminder.changed';

/** The official toast stays for three seconds. */
export const REMINDER_TOAST_DURATION_MS = 3000;

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function clock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The subtitle: `今天 18:00` / `明天 09:00` / `3月10日 09:00`. */
export function nextReminderText(remindAt: string | null, now: Date = new Date()): string {
  if (!remindAt) return '不提醒';
  const at = new Date(remindAt);
  if (Number.isNaN(at.getTime())) return '不提醒';

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (sameLocalDay(at, now)) return `今天 ${clock(at)}`;
  if (sameLocalDay(at, tomorrow)) return `明天 ${clock(at)}`;
  const month = at.getMonth() + 1;
  return `${month}月${at.getDate()}日 ${clock(at)}`;
}
