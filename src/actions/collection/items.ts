'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { revalidatePath } from 'next/cache';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

export async function addItem(collectionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();

  const collection = await db.orm.public.Collection.first({ id: collectionId });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }

  const items = await db.orm.public.CollectionItem.where({ collectionId }).all();
  const maxOrder = items.reduce((max: number, item: any) => Math.max(max, item.order ?? 0), -1);

  const itemId = crypto.randomUUID();
  await db.orm.public.CollectionItem.create({
    id: itemId,
    collectionId,
    order: maxOrder + 1,
  });

  await emitSyncEventSafe(db, session.user.id, ['collection_item'], itemId);
  revalidatePath(`/collections/${collectionId}`);
  return { id: itemId, collectionId, order: maxOrder + 1 };
}

export async function deleteItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();

  const item = await db.orm.public.CollectionItem.first({ id: itemId });
  if (!item) throw new Error('项目不存在');

  const collection = await db.orm.public.Collection.first({ id: (item as any).collectionId });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }

  const values = await db.orm.public.CollectionValue.where({ itemId }).all();
  for (const v of values) {
    await db.orm.public.CollectionValue.where({ id: (v as any).id }).update({
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  await db.orm.public.CollectionItem.where({ id: itemId }).update({
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  // 条目 + 其取值同批软删 → 合并一次广播
  await emitSyncEventSafe(db, session.user.id,
    ['collection_item', 'collection_value'], itemId);

  revalidatePath(`/collections/${(item as any).collectionId}`);
}

export async function updateItemOrder(itemId: string, newOrder: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const item = await db.orm.public.CollectionItem.first({ id: itemId });
  if (!item) throw new Error('项目不存在');
  const collection = await db.orm.public.Collection.first({ id: (item as any).collectionId });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }

  await db.orm.public.CollectionItem.where({ id: itemId }).update({
    order: newOrder,
  });
  await emitSyncEventSafe(db, session.user.id, ['collection_item'], itemId);
}

export async function setItemValue(
  itemId: string,
  propertyId: string,
  value: any
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();

  const item = await db.orm.public.CollectionItem.first({ id: itemId });
  if (!item) throw new Error('项目不存在');
  const collection = await db.orm.public.Collection.first({ id: (item as any).collectionId });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }
  const property = await db.orm.public.CollectionProperty.first({ id: propertyId });
  if (!property || (property as any).collectionId !== (item as any).collectionId) {
    throw new Error('属性不存在');
  }

  const existing = await db.orm.public.CollectionValue
    .where({ itemId, propertyId })
    .all();

  if (existing.length > 0) {
    await db.orm.public.CollectionValue.where({ id: (existing[0] as any).id }).update({
      value: value != null ? JSON.stringify(value) : null,
    });
  } else {
    await db.orm.public.CollectionValue.create({
      id: crypto.randomUUID(),
      itemId,
      propertyId,
      value: value != null ? JSON.stringify(value) : null,
    });
  }

  await emitSyncEventSafe(db, session.user.id, ['collection_value'], itemId);
  revalidatePath(`/collections/${(item as any).collectionId}`);
}

function parseStoredValue(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw ?? null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * G284：删分组＝清字段值，不删行。官方文案「这将删除 [1] 个项目中的"[0]"值。项目本身不会被删除。」
 * 单选命中组键，多选从数组里摘掉该键（摘空写 null）；检查框按布尔组键处理。
 */
export async function clearGroupValues(collectionId: string, propertyId: string, groupKey: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const collection = await db.orm.public.Collection.first({ id: collectionId });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }
  const property = await db.orm.public.CollectionProperty.first({ id: propertyId });
  if (!property || (property as any).collectionId !== collectionId) {
    throw new Error('属性不存在');
  }

  const values = await db.orm.public.CollectionValue.where({ propertyId }).all();
  let cleared = 0;
  for (const row of values) {
    if ((row as any).deletedAt) continue;
    const parsed = parseStoredValue((row as any).value);
    if (parsed === null || parsed === undefined) continue;

    let next: unknown;
    if (Array.isArray(parsed)) {
      if (!parsed.includes(groupKey)) continue;
      const rest = parsed.filter((entry) => entry !== groupKey);
      next = rest.length ? rest : null;
    } else if (parsed === groupKey) {
      next = null;
    } else {
      continue;
    }

    await db.orm.public.CollectionValue.where({ id: (row as any).id }).update({
      value: next === null ? null : JSON.stringify(next),
    });
    cleared += 1;
  }

  if (cleared > 0) {
    await emitSyncEventSafe(db, session.user.id, ['collection_value'], collectionId);
    revalidatePath(`/collections/${collectionId}`);
  }
  return cleared;
}
