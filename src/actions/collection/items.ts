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
