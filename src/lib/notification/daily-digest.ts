/* eslint-disable @typescript-eslint/no-explicit-any */
//
// Daily in-app digest (G03). The email channel is a separate, unimplemented
// delivery path (G1488); this file only materialises the push-side summary and
// gates it on `notifyDaily`. It runs at the head of the metadata poll, like the
// reminder generator, so no scheduler is involved.

import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

export function startOfLocalDay(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfLocalDay(now: Date = new Date()): Date {
  const end = startOfLocalDay(now);
  end.setDate(end.getDate() + 1);
  return end;
}

export function isInDay(value: unknown, start: Date, end: Date): boolean {
  if (typeof value !== 'string' && !(value instanceof Date)) return false;
  const time = new Date(value as string | Date).getTime();
  if (Number.isNaN(time)) return false;
  return time >= start.getTime() && time < end.getTime();
}

/** The official push title was not collected; this is a local, factual summary. */
export function dailyDigestTitle(taskCount: number, reminderCount: number): string {
  return `今天的摘要：${taskCount} 个任务、${reminderCount} 个提醒`;
}

/**
 * One digest per local day. A day with nothing due produces nothing, so the
 * switch only becomes observable on days that actually have work.
 */
export async function materializeDailyDigest(
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const db = await getDb();
  const user = await db.orm.public.User.first({ id: userId });
  if (!user || user.notifyDaily !== true) return 0;

  const start = startOfLocalDay(now);
  const end = endOfLocalDay(now);

  const existing: Record<string, unknown>[] = await db.orm.public.Notification
    .where({ userId, kind: 'dailyDigest' })
    .where((row: any) => row.createdAt.gte(start))
    .where((row: any) => row.createdAt.lt(end))
    .all();
  if (existing.length > 0) return 0;

  const tasks: Record<string, unknown>[] = await db.orm.public.Task
    .where((task: any) => task.userId.eq(userId))
    .all();

  const live = tasks.filter((task) => task.isCompleted !== true && task.status !== 'cancelled');
  const dueToday = live.filter((task) => isInDay(task.dueDate, start, end)).length;
  const remindersToday = live.filter((task) => isInDay(task.remindAt, start, end)).length;
  if (dueToday + remindersToday === 0) return 0;

  const id = crypto.randomUUID();
  await db.orm.public.Notification.create({
    id,
    userId,
    kind: 'dailyDigest',
    title: dailyDigestTitle(dueToday, remindersToday),
    remindAt: now.toISOString(),
  });
  await emitSyncEventSafe(db, userId, ['notification'], id);
  return 1;
}
