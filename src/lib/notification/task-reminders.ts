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
 * G252 —— 非任务块提醒的候选形状。与 `ReminderCandidate` 同构，但键是 `(documentId, blockId)`
 * 而不是 taskId：任务行有 pk，普通块只有正文里的地址。
 */
export interface BlockReminderCandidate {
  blockId: string;
  documentId: string;
  title: string;
  remindAt: string;
  isCompleted: boolean;
}

export interface DueBlockReminder {
  blockId: string;
  documentId: string;
  title: string;
  remindAt: string;
}

/** 块提醒的实例身份：同一枚块改期＝新提醒。 */
export function blockNotificationKey(blockId: string, remindAt: string): string {
  const at = reminderInstant(remindAt);
  return `${blockId}|${Number.isNaN(at) ? remindAt : at}`;
}

/**
 * 与 `dueReminders` 同一套窗口与去重判据，只是键换成块地址、完成态换成 `isCompleted`
 * （非任务块没有"取消"这一档，`resolve` 就是它的终态）。
 */
export function dueBlockReminders(
  candidates: readonly BlockReminderCandidate[],
  notifiedKeys: Iterable<string>,
  now: number,
): DueBlockReminder[] {
  const notified = new Set(notifiedKeys);
  const due: DueBlockReminder[] = [];

  for (const block of candidates) {
    if (block.isCompleted || !block.remindAt) continue;
    const at = reminderInstant(block.remindAt);
    if (Number.isNaN(at) || at > now || now - at > REMINDER_LOOKBACK_MS) continue;
    if (notified.has(blockNotificationKey(block.blockId, block.remindAt))) continue;

    due.push({
      blockId: block.blockId,
      documentId: block.documentId,
      title: block.title,
      remindAt: block.remindAt,
    });
  }

  return due;
}

/**
 * Postgres returns a `timestamptz` as "2026-10-02 18:06:49.485+08" rather than
 * the ISO string that was written, so `Date.parse` gets a second chance with the
 * space swapped for a `T`. Kept local rather than imported: the only other
 * copy lived in the retired poll-based sync module, and this file stays
 * loadable without a database.
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
    // 已取消＝不再要做（G52）：它和完成一样退出投递，否则一个被放弃的任务还会敲门。
    if (!task.remindAt || task.isCompleted || task.status === 'done' || task.status === 'cancelled') continue;

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
