'use server';

import { assertOwned, requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

// I2/NOTE：document 的 tsCol 是 metaUpdatedAt——删除/恢复属元数据，
// 必须显式 bump（无 DB 默认值，不 bump 则不进增量同步流）并广播。
export async function deleteDocument(id: string) {
  const userId = await requireUserId();
  await assertOwned('Document', id, userId, '文档不存在或不属于你');

  const db = await getDb();
  const now = new Date().toISOString();
  await db.orm.public.Document
    .where({ id, userId })
    .update({
      isDeleted: true,
      deletedAt: now,
      metaUpdatedAt: now,
    } as Record<string, unknown>);
  await emitSyncEventSafe(db, userId, ['document'], id);
}

export async function restoreDocument(id: string) {
  const userId = await requireUserId();
  await assertOwned('Document', id, userId, '文档不存在或不属于你');

  const db = await getDb();
  const now = new Date().toISOString();
  await db.orm.public.Document
    .where({ id, userId })
    .update({
      isDeleted: false,
      deletedAt: null,
      metaUpdatedAt: now,
    } as Record<string, unknown>);
  await emitSyncEventSafe(db, userId, ['document'], id);
}

export async function permanentDeleteDocument(id: string) {
  const userId = await requireUserId();
  await assertOwned('Document', id, userId, '文档不存在或不属于你');

  const db = await getDb();
  // 物理删除：行消失即被全量对账判删（30d 兜底），无 tsCol 可 bump；
  // 广播一次让其他端尽快 pull
  await db.orm.public.Document
    .where({ id, userId })
    .delete();
  await emitSyncEventSafe(db, userId, ['document'], id);
}
