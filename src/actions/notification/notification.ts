'use server';

/* eslint-disable @typescript-eslint/no-explicit-any */
// The filter callbacks below receive column proxies the emitted types do not name.
import { requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { unreadReminders, type InboxRow } from '@/lib/notification/inbox';

export async function listNotifications(): Promise<InboxRow[]> {
  const userId = await requireUserId();

  const db = await getDb();
  const rows: Record<string, unknown>[] = await db.orm.public.Notification
    .where((d: any) => d.userId.eq(userId))
    .where((d: any) => d.isResolved.eq(false))
    .select('id', 'title', 'remindAt', 'documentId')
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
  // same cursor that brought it here.
  await db.orm.public.Notification.where({ id }).update({
    isResolved: true,
    resolvedAt: new Date().toISOString(),
  });
}
