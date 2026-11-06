'use server';

import { requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

/**
 * G151：自定义样式是一等内容实体——保存当前页样式、重命名、套用、设为文档默认。
 * `style` 存与 `Document.pageStyle` 同形状的字段子集（见 `custom-style-patch.ts` 的键表）。
 * 官方「条数上限受套餐门禁」在本地 N/A（本项目自用、无付费面）。
 */
export interface CustomStyleRow {
  id: string;
  name: string;
  style: Record<string, unknown>;
  isDefault: boolean;
}

function toRow(record: any): CustomStyleRow {
  return {
    id: String(record.id),
    name: String(record.name ?? ''),
    style: record.style && typeof record.style === 'object' ? record.style : {},
    isDefault: record.isDefault === true,
  };
}

export async function listCustomStyles(): Promise<CustomStyleRow[]> {
  const userId = await requireUserId();
  const db = await getDb();
  const rows = await db.orm.public.CustomStyle.where({ userId }).all();
  return (rows as any[])
    .filter((row) => !row.deletedAt)
    .sort((a, b) => (Number(a.order ?? 0) - Number(b.order ?? 0)) || String(a.createdAt).localeCompare(String(b.createdAt)))
    .map(toRow);
}

export async function createCustomStyle(input: {
  name: string;
  style: Record<string, unknown>;
}): Promise<CustomStyleRow> {
  const userId = await requireUserId();
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error('样式名不能为空');
  const db = await getDb();
  const record = await db.orm.public.CustomStyle.create({
    id: crypto.randomUUID(),
    userId,
    name,
    style: input.style ?? {},
    isDefault: false,
    order: Date.now(),
  });
  await emitSyncEventSafe(db, userId, ['customStyle'], String((record as any).id));
  return toRow(record);
}

export async function renameCustomStyle(id: string, name: string): Promise<void> {
  const userId = await requireUserId();
  const next = name.trim().slice(0, 80);
  if (!next) throw new Error('样式名不能为空');
  const db = await getDb();
  const existing = await db.orm.public.CustomStyle.first({ id });
  if (!existing || (existing as any).userId !== userId || (existing as any).deletedAt) throw new Error('样式不存在');
  await db.orm.public.CustomStyle.where({ id }).update({ name: next });
  await emitSyncEventSafe(db, userId, ['customStyle'], id);
}

export async function deleteCustomStyle(id: string): Promise<void> {
  const userId = await requireUserId();
  const db = await getDb();
  const existing = await db.orm.public.CustomStyle.first({ id });
  if (!existing || (existing as any).userId !== userId || (existing as any).deletedAt) throw new Error('样式不存在');
  await db.orm.public.CustomStyle.where({ id }).update({
    deletedAt: new Date().toISOString(),
    isDefault: false,
  });
  await emitSyncEventSafe(db, userId, ['customStyle'], id);
}

/** 设为文档默认：同一时刻只有一个默认样式；传 `null` 取消全部默认。 */
export async function setDefaultCustomStyle(id: string | null): Promise<void> {
  const userId = await requireUserId();
  const db = await getDb();
  const rows = (await db.orm.public.CustomStyle.where({ userId }).all()) as any[];
  const live = rows.filter((row) => !row.deletedAt && row.isDefault);
  for (const row of live) {
    if (id === null || String(row.id) !== id) {
      await db.orm.public.CustomStyle.where({ id: row.id }).update({ isDefault: false });
    }
  }
  if (id !== null) {
    const target = rows.find((row) => String(row.id) === id && !row.deletedAt);
    if (!target) throw new Error('样式不存在');
    await db.orm.public.CustomStyle.where({ id }).update({ isDefault: true });
    await emitSyncEventSafe(db, userId, ['customStyle'], id);
  } else if (live.length) {
    await emitSyncEventSafe(db, userId, ['customStyle'], String(live[0].id));
  }
}