/* eslint-disable @typescript-eslint/no-explicit-any */
//
// Pull-based reminder delivery (G02).
//
// There is no scheduler here on purpose: this runs at the head of the metadata
// poll, so a reminder becomes an in-app notification the first time the signed-in
// user's client asks what changed. The unique key on (taskId, remindAt) is what
// keeps repeated polls from stacking duplicates.

import { getDb } from '@/prisma/db';
import {
  REMINDER_LOOKBACK_MS,
  dueReminders,
  notificationKey,
  type ReminderCandidate,
} from './task-reminders';

/**
 * Returns how many notifications were created. Never throws for the ordinary
 * "already notified" case — that is a no-op, not an error.
 */
export async function materializeTaskReminders(
  userId: string,
  now: number = Date.now(),
): Promise<number> {
  const db = await getDb();

  const user = await db.orm.public.User.first({ id: userId });
  // The settings switch gates delivery: off means nothing is generated at all.
  if (!user || user.notifyReminders !== true) return 0;

  const candidates: ReminderCandidate[] = await db.orm.public.Task
    .where((d: any) => d.userId.eq(userId))
    .where((d: any) => d.isCompleted.eq(false))
    .where((d: any) => d.remindAt.gte(new Date(now - REMINDER_LOOKBACK_MS)))
    .where((d: any) => d.remindAt.lte(new Date(now)))
    .select('id', 'title', 'documentId', 'isCompleted', 'status', 'remindAt')
    .all();
  if (candidates.length === 0) return 0;

  const notified: Record<string, unknown>[] = await db.orm.public.Notification
    .where((d: any) => d.taskId.in(candidates.map((task) => task.id)))
    .select('taskId', 'remindAt')
    .all();
  const keys = notified
    .filter((row) => row.taskId !== null && row.remindAt !== null)
    .map((row) => notificationKey(String(row.taskId), String(row.remindAt)));

  let pending = dueReminders(candidates, keys, now);

  const documentIds = [...new Set(pending.map((row) => row.documentId).filter(Boolean))] as string[];
  if (documentIds.length > 0) {
    const documents: Record<string, unknown>[] = await db.orm.public.Document
      .where((d: any) => d.id.in(documentIds))
      .select('id', 'isDeleted')
      .all();
    const trashed = new Set(documents.filter((doc) => doc.isDeleted === true).map((doc) => String(doc.id)));
    pending = pending.filter((row) => !row.documentId || !trashed.has(row.documentId));
  }

  for (const due of pending) {
    await db.orm.public.Notification.create({
      id: crypto.randomUUID(),
      userId,
      kind: 'taskReminder',
      taskId: due.taskId,
      documentId: due.documentId,
      title: due.title,
      remindAt: due.remindAt,
    });
  }

  return pending.length;
}
