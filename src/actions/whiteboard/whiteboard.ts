'use server';

import { assertOwned, getTable, requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { emitSyncEvent } from '@/lib/sync/emit-event';

export interface WhiteboardRecord {
  id: string;
  name: string;
  icon: string | null;
  data: unknown;
  order: number;
  folderId: string | null;
  userId: string;
  isDeleted: boolean;
  sharePermission: 'off' | 'view' | 'edit';
  shareToken: string | null;
  shareVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface WhiteboardItem {
  id: string;
  name: string;
  icon: string | null;
  updatedAt: string;
}

export interface DeletedWhiteboardItem extends WhiteboardItem {
  deletedAt: string | null;
}

export async function getWhiteboards(): Promise<WhiteboardItem[]> {
  const userId = await requireUserId();

  const boards = await (await getTable('Whiteboard'))
    .where({ userId, isDeleted: false })
    .orderBy((m) => m.order.asc())
    .all();

  return boards.map((w) => ({
    id: w.id as string,
    name: w.name as string,
    icon: (w.icon as string) ?? null,
    updatedAt: w.updatedAt as string,
  }));
}

/**
 * 白板没有进回收站（回收站只认 `Document` 表），删除后的恢复入口就在白板列表页的
 * 「最近删除」分档里 —— 所以这里必须能读到墓碑行，否则删掉就再也见不到。
 */
export async function getDeletedWhiteboards(): Promise<DeletedWhiteboardItem[]> {
  const userId = await requireUserId();

  const boards = await (await getTable('Whiteboard'))
    .where({ userId, isDeleted: true })
    .all();

  return boards
    .map((w) => ({
      id: w.id as string,
      name: w.name as string,
      icon: (w.icon as string) ?? null,
      updatedAt: w.updatedAt as string,
      deletedAt: (w.deletedAt as string) ?? null,
    }))
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
}

export async function getWhiteboard(id: string) {
  const userId = await requireUserId();

  const board = await (await getTable('Whiteboard')).first({ id });
  if (!board || board.userId !== userId || board.isDeleted) return null;
  return board as unknown as WhiteboardRecord;
}

export async function createWhiteboard(name?: string) {
  const userId = await requireUserId();

  const metaTs = new Date().toISOString();
  const board = await (await getTable('Whiteboard')).create({
    id: crypto.randomUUID(),
    name: name ?? '未命名白板',
    icon: '🎨',
    userId,
    // No DB default on metaUpdatedAt; without it new rows never enter the
    // incremental-sync stream (whiteboard tsCol is metaUpdatedAt).
    metaUpdatedAt: metaTs,
  });

  // I2：新建白板同样要广播（其余端靠 meta 事件拉到新行）
  try {
    const db = await getDb();
    await emitSyncEvent(db, userId, ['whiteboard'],
      { ts: metaTs, id: (board as any).id ?? metaTs });
  } catch {
    // broadcast failure must never block creating
  }
  return board;
}

export async function renameWhiteboard(id: string, name: string) {
  const userId = await requireUserId();
  await assertOwned('Whiteboard', id, userId, '白板不存在');

  // 白板 tsCol 是 metaUpdatedAt：改名属元数据，须 bump 才进增量流（I2 NOTE）
  const now = new Date().toISOString();
  await (await getTable('Whiteboard')).where({ id, userId })
    .update({ name, metaUpdatedAt: now });

  try {
    const db = await getDb();
    await emitSyncEvent(db, userId, ['whiteboard'], { ts: now, id });
  } catch {
    // broadcast failure must never block renaming
  }
}

export async function saveWhiteboardData(id: string, data: unknown) {
  const userId = await requireUserId();
  await assertOwned('Whiteboard', id, userId, '白板不存在');

  await (await getTable('Whiteboard')).where({ id, userId })
    .update({ data: data as Record<string, unknown> });
}

export async function deleteWhiteboard(id: string) {
  const userId = await requireUserId();
  await assertOwned('Whiteboard', id, userId, '白板不存在');

  // Deletion is metadata: bump metaUpdatedAt (whiteboard tsCol) so the
  // deletion propagates via incremental sync. Content saves must not bump it.
  const now = new Date().toISOString();
  await (await getTable('Whiteboard')).where({ id, userId }).update({
    isDeleted: true,
    deletedAt: now,
    metaUpdatedAt: now,
  } as Record<string, unknown>);

  // R-17 选定「server emit」：当前 UI 无白板删除调用点（无法 applyLocal 迁移），
  // 删除动作发生时同步广播，其他端拉取即见（与 R-16 兜底同模式）。
  try {
    const db = await getDb();
    await emitSyncEvent(db, userId, ['whiteboard'], { ts: now, id });
  } catch {
    // broadcast failure must never block deleting
  }
}
