'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { revalidatePath } from 'next/cache';

export async function createCollection(data: {
  name: string;
  icon?: string;
  description?: string;
  folderId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const collectionId = crypto.randomUUID();

  await db.orm.public.Collection.create({
    id: collectionId,
    name: data.name,
    icon: data.icon ?? null,
    description: data.description ?? null,
    folderId: data.folderId ?? null,
    userId: session.user.id,
  });

  await db.orm.public.CollectionView.create({
    id: crypto.randomUUID(),
    collectionId,
    name: '默认视图',
    type: 'table',
    isActive: true,
  });

  await db.orm.public.CollectionProperty.create({
    id: crypto.randomUUID(),
    collectionId,
    name: '名称',
    type: 'text',
    order: 0,
    isVisible: true,
  });

  revalidatePath('/collections');
  return { id: collectionId };
}

export async function updateCollection(
  id: string,
  data: { name?: string; icon?: string; description?: string }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const collection = await db.orm.public.Collection.first({ id });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.icon !== undefined) updateData.icon = data.icon || null;
  if (data.description !== undefined) updateData.description = data.description || null;

  await db.orm.public.Collection.where({ id }).update(updateData);
  revalidatePath('/collections');
  revalidatePath(`/collections/${id}`);
}

export async function deleteCollection(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const collection = await db.orm.public.Collection.first({ id });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }

  await db.orm.public.Collection.where({ id }).update({
    isDeleted: true,
    deletedAt: new Date(),
  });

  revalidatePath('/collections');
}

export async function getCollection(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const collection = await db.orm.public.Collection.first({ id });
  if (!collection) return null;

  const c = collection as Record<string, unknown>;
  if (c.userId !== session.user.id || c.isDeleted) return null;

  const properties = await db.orm.public.CollectionProperty
    .where({ collectionId: id })
    .orderBy((m: any) => m.order.asc())
    .all();

  const items = await db.orm.public.CollectionItem
    .where({ collectionId: id })
    .orderBy((m: any) => m.order.asc())
    .all();

  const views = await db.orm.public.CollectionView
    .where({ collectionId: id })
    .orderBy((m: any) => m.order.asc())
    .all();

  const itemsWithValues = [];
  for (const item of items) {
    const values = await db.orm.public.CollectionValue
      .where({ itemId: (item as any).id })
      .all();
    itemsWithValues.push({ ...item, values });
  }

  return {
    ...collection,
    properties,
    items: itemsWithValues,
    views,
    _count: {
      items: items.length,
    },
  };
}

export async function getCollections() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const collections = await db.orm.public.Collection
    .where({ userId: session.user.id, isDeleted: false })
    .orderBy((m: any) => m.order.asc())
    .all();

  const ids: string[] = [];
  for (const c of collections) ids.push(String(c.id));
  if (ids.length === 0) return [];

  // Two reads for the whole page instead of two per collection. The loop cost 2N+1 round
  // trips (measured: 4 collections = 9 statements, 2 = 5) and pulled every item column to
  // count rows the caller only wants a number for.
  const [properties, items] = await Promise.all([
    db.orm.public.CollectionProperty
      // Callback form: `.where({ collectionId: { in: [] } })` matches nothing instead of
      // erroring, so the empty case above has to stay.
      .where((m: any) => m.collectionId.in(ids))
      .all(),
    db.orm.public.CollectionItem.where((m: any) => m.collectionId.in(ids))
      .select('id', 'collectionId')
      .all(),
  ]);

  const propsByCollection = new Map<string, Record<string, unknown>[]>();
  for (const p of properties as Record<string, unknown>[]) {
    const key = String(p.collectionId);
    const bucket = propsByCollection.get(key);
    if (bucket) bucket.push(p);
    else propsByCollection.set(key, [p]);
  }
  const itemsByCollection = new Map<string, number>();
  for (const i of items as Record<string, unknown>[]) {
    const key = String(i.collectionId);
    itemsByCollection.set(key, (itemsByCollection.get(key) ?? 0) + 1);
  }

  const result = [];
  for (const c of collections) {
    result.push({
      ...c,
      properties: propsByCollection.get(String(c.id)) ?? [],
      _count: { items: itemsByCollection.get(String(c.id)) ?? 0 },
    });
  }
  return result;
}
