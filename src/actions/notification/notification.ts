'use server';

/* eslint-disable @typescript-eslint/no-explicit-any */
// The filter callbacks below receive column proxies the emitted types do not name.
import { requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { unreadReminders, type InboxRow } from '@/lib/notification/inbox';

export async function listNotifications(): Promise<InboxRow[]> {
  const userId = await requireUserId();

  const db = await getDb();
  const rows: Record<string, unknown>[] = await db.orm.public.Notification
    .where((d: any) => d.userId.eq(userId))
    .where((d: any) => d.isResolved.eq(false))
    .select('id', 'title', 'kind', 'remindAt', 'documentId', 'blockId', 'readAt')
    .all();

  // Sorting stays in `unreadReminders`, which knows both time spellings the
  // driver produces and gives a stable order for equal instants.
  return unreadReminders(rows);
}

export async function resolveNotification(id: string) {
  const userId = await requireUserId();

  const db = await getDb();
  const notification = await db.orm.public.Notification.first({ id });
  if (!notification || notification.userId !== userId) throw new Error('未授权');

  // Bumping updatedAt is the point: the row leaves other devices through the
  // same cursor that brought it here. The broadcast wakes those devices now
  // instead of waiting for the 30s poll.
  await db.orm.public.Notification.where({ id }).update({
    isResolved: true,
    resolvedAt: new Date().toISOString(),
  });
  await emitSyncEventSafe(db, userId, ['notification'], id);
}

/** G137: read/unread is reversible; resolving (dismissing) stays a separate action. */
export async function setNotificationRead(id: string, read: boolean) {
  const userId = await requireUserId();

  const db = await getDb();
  const notification = await db.orm.public.Notification.first({ id });
  if (!notification || notification.userId !== userId) throw new Error('未授权');

  await db.orm.public.Notification.where({ id }).update({
    readAt: read ? new Date().toISOString() : null,
  });
  await emitSyncEventSafe(db, userId, ['notification'], id);
}

/** 「全部标为已读」— only unread rows are touched, so already-read rows keep their timestamp. */
export async function markAllNotificationsRead(): Promise<number> {
  const userId = await requireUserId();

  const db = await getDb();
  const rows: Record<string, unknown>[] = await db.orm.public.Notification
    .where((d: any) => d.userId.eq(userId))
    .where((d: any) => d.isResolved.eq(false))
    .select('id', 'readAt')
    .all();

  const unread = rows.filter((row) => row.readAt == null);
  const now = new Date().toISOString();
  for (const row of unread) {
    await db.orm.public.Notification.where({ id: row.id as string }).update({ readAt: now });
  }
  if (unread.length > 0) await emitSyncEventSafe(db, userId, ['notification'], userId);
  return unread.length;
}
