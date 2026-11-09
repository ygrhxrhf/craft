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

/**
 * G1001：官方永久删除文档时，文档里的任务行一并消失（实测 tasks 14→9）。
 * 必须在删文档**之前**跑：`Task.document` 的外键是 SetNull，文档先没的话
 * `documentId` 当场被清空，按文档 id 再也圈不到这些行，只剩孤儿。
 * 软删（deleteDocument）刻意不这么做——官方软删保留行、屏上由 getTasks 过滤（G671/G934）。
 */
async function deleteTasksOfDocuments(db: any, documentIds: string[]): Promise<void> {
  const rows = await db.orm.public.Task
    .where((r: any) => r.documentId.in(documentIds))
    .select('id')
    .all();
  if (rows.length === 0) return;
  // 先圈主键再按集合删（同 emptyTrash：本版 ORM 多条件 delete 的行数语义不可靠）
  const ids = rows.map((row: { id: string }) => String(row.id));
  await db.orm.public.Task.where((r: any) => r.id.in(ids)).deleteAndCount();
}

export async function permanentDeleteDocument(id: string) {
  const userId = await requireUserId();
  await assertOwned('Document', id, userId, '文档不存在或不属于你');

  const db = await getDb();
  await deleteTasksOfDocuments(db, [id]);
  // 物理删除：行消失即被全量对账判删（30d 兜底），无 tsCol 可 bump；
  // 广播一次让其他端尽快 pull（任务/通知随文档一起没了，一并点名）
  await db.orm.public.Document
    .where({ id, userId })
    .delete();
  await emitSyncEventSafe(db, userId, ['document', 'task', 'notification'], id);
}

/** G233：清空最近删除＝把该用户所有在回收站里的文档一次性物理删除（等同官方 `commands.empty.trash`）。 */
export async function emptyTrash(): Promise<number> {
  const userId = await requireUserId();

  const db = await getDb();
  const rows = await db.orm.public.Document
    .where({ userId, isDeleted: true })
    .select('id')
    .all();
  const ids = rows.map((row: { id: string }) => String(row.id));
  if (ids.length === 0) return 0;

  // 同 permanentDeleteDocument：任务行必须在文档行消失前按 documentId 圈出来删掉，
  // SetNull 会在文档先没时清空 documentId，之后就再也圈不到这些孤儿。
  await deleteTasksOfDocuments(db, ids);
  // 先取主键、再按主键集合删（与 sync route 的 purgeTombstones 同一口径）：
  // 本版 ORM 的 where 简写只支持 = / IS NULL，且多条件 delete 终端的行数语义未经证实
  // ——探针实测 `where({userId,isDeleted:true}).delete()` 只删掉一行。
  await db.orm.public.Document
    .where((r: any) => r.id.in(ids))
    .deleteAndCount();
  // 广播一次让其他端尽快 pull（同 permanentDeleteDocument：物理删除无 tsCol 可 bump）
  await emitSyncEventSafe(db, userId, ['document', 'task', 'notification'], ids[ids.length - 1]);
  return ids.length;
}
