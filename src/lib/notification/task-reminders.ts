/**
 * Decide which task reminders still owe the user a notification.
 *
 * Pure on purpose: the pull-based delivery in `./materialize` runs inside a
 * 2.5s poll, so the rules have to be checkable without a database.
 */

/**
 * A reminder older than this is not delivered. Local generation is lazy (it
 * happens on the next poll), so without a ceiling a week offline would turn
 * into a week of notifications arriving at once.
 */
export const REMINDER_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export interface ReminderCandidate {
  id: string;
  title: string;
  remindAt: string | null;
  documentId: string | null;
  isCompleted: boolean;
  status: string;
}

export interface DueReminder {
  taskId: string;
  title: string;
  remindAt: string;
  documentId: string | null;
}

/**
 * Postgres returns a `timestamptz` as "2026-10-02 18:06:49.485+08" rather than
 * the ISO string that was written, so `Date.parse` gets a second chance with the
 * space swapped for a `T`. Deliberately not importing `toEpochMs` from
 * `@/lib/sync/changes`: that module pulls in Prisma, and this file stays loadable
 * without a database.
 */
export function reminderInstant(value: string): number {
  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) return direct;
  return Date.parse(value.replace(' ', 'T'));
}

/** Identity of one reminder instance: moving the time is a new reminder. */
export function notificationKey(taskId: string, remindAt: string): string {
  const at = reminderInstant(remindAt);
  return `${taskId}|${Number.isNaN(at) ? remindAt : at}`;
}

export function dueReminders(
  candidates: readonly ReminderCandidate[],
  notifiedKeys: Iterable<string>,
  now: number,
): DueReminder[] {
  const notified = new Set(notifiedKeys);
  const due: DueReminder[] = [];

  for (const task of candidates) {
    if (!task.remindAt || task.isCompleted || task.status === 'done') continue;

    const at = reminderInstant(task.remindAt);
    if (Number.isNaN(at) || at > now || now - at > REMINDER_LOOKBACK_MS) continue;
    if (notified.has(notificationKey(task.id, task.remindAt))) continue;

    due.push({
      taskId: task.id,
      title: task.title,
      remindAt: task.remindAt,
      documentId: task.documentId,
    });
  }

  return due;
}
