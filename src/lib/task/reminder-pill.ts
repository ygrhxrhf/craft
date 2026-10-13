/**
 * The reminder pill and its management menu (G1468). Once a block carries a reminder the pill
 * prints the time as 「今天, 18:12」 — a comma and a space between the day and the clock — and the
 * pill itself is the only way to manage it: the block's `⋯` menu does not gain an entry.
 *
 * The three menu actions use the *short* command keys, not the reminder family's longer synonyms.
 * `标记为已解决` is `commands.mark.as.resolved`, not `commands.reminder.mark.resolved` (which
 * reads 「将提醒标记为已解决」).
 */

export type ReminderActionId = 'markResolved' | 'reschedule' | 'remove';

export interface ReminderAction {
  id: ReminderActionId;
  label: string;
  key: string;
}

export const REMINDER_ACTIONS: readonly ReminderAction[] = [
  { id: 'markResolved', label: '标记为已解决', key: 'commands.mark.as.resolved' },
  { id: 'reschedule', label: '改期', key: 'commands.reschedule' },
  { id: 'remove', label: '移除提醒', key: 'commands.remove.reminder' },
] as const;

/** Day-granularity words the pill prints for the near days. */
export const PILL_DAY_TODAY = '今天';
export const PILL_DAY_TOMORROW = '明天';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** `HH:MM`, 24-hour, zero-padded — the clock half of the pill. */
export function pillClock(at: Date): string {
  return `${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/**
 * The pill's text. A reminder today or tomorrow prints the word; anything further out prints the
 * date. The separator is the collected 「, 」 — comma then space.
 */
export function reminderPillLabel(at: Date, now: Date = new Date()): string {
  const clock = pillClock(at);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(at, now)) return `${PILL_DAY_TODAY}, ${clock}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(at, tomorrow)) return `${PILL_DAY_TOMORROW}, ${clock}`;
  return `${at.getMonth() + 1}月${at.getDate()}日, ${clock}`;
}
