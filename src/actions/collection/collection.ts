'use server';

import { removeMembership } from '@/lib/collection/object-membership';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { revalidatePath } from 'next/cache';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

// I2：集合系列表用 updatedAt 自动 bump，落库后广播即可；失败不阻断业务。
const emitCollections = emitSyncEventSafe;

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

  // 集合 + 默认视图 + 默认属性同批创建 → 合并为一次广播
  await emitCollections(db, session.user.id,
    ['collection', 'collection_view', 'collection_property'], collectionId);

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
  await emitCollections(db, session.user.id, ['collection'], id);
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

  // G428: deleting a collection clears the membership only — an item that also belongs to another
  // collection keeps its row (and its values), just without this collection in its `schemas`.
  // Rows whose only membership was this one are tombstoned like before.
  const items = await db.orm.public.CollectionItem.where({ collectionId: id, deletedAt: null }).all();
  const now = new Date().toISOString();
  for (const item of items) {
    const row = item as Record<string, unknown>;
    const membership = removeMembership(
      { schemas: normalizeSchemas(row.schemas), objectSchemaId: null },
      id,
    );
    if (membership.schemas.length > 0) {
      await db.orm.public.CollectionItem.where({ id: String(row.id) }).update({
        schemas: membership.schemas,
        updatedAt: now,
      });
    } else {
      await db.orm.public.CollectionItem.where({ id: String(row.id) }).update({
        deletedAt: now,
        updatedAt: now,
      });
    }
  }

  await emitCollections(db, session.user.id, ['collection', 'collection_item'], id);

  revalidatePath('/collections');
}

/** G427: a row's membership array; a missing/invalid value reads as the single `collectionId`. */
function normalizeSchemas(raw: unknown, fallback?: string): string[] {
  if (Array.isArray(raw)) return raw.filter((value): value is string => typeof value === 'string');
  if (typeof raw === 'string' && raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((value): value is string => typeof value === 'string');
    } catch {
      // fall through to the fallback
    }
  }
  return fallback ? [fallback] : [];
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
    .where({ collectionId: id, deletedAt: null })
    .orderBy((m: any) => m.order.asc())
    .all();

  const items = await db.orm.public.CollectionItem
    .where({ collectionId: id, deletedAt: null })
    .orderBy((m: any) => m.order.asc())
    .all();

  const views = await db.orm.public.CollectionView
    .where({ collectionId: id, deletedAt: null })
    .orderBy((m: any) => m.order.asc())
    .all();

  const itemIds: string[] = [];
  for (const item of items) itemIds.push(String(item.id));

  // One read for every row on the page. The loop this replaces cost one statement per
  // item (measured: 1 item = 5 statements, 4 items = 8), and a collection table is
  // exactly the page where row counts grow.
  const values = itemIds.length === 0
    ? []
    : (await db.orm.public.CollectionValue
        // Callback form required: the object form silently matches nothing.
        .where((m: any) => m.itemId.in(itemIds))
        .where({ deletedAt: null })
        .all() as Record<string, unknown>[]);

  const valuesByItem = new Map<string, Record<string, unknown>[]>();
  for (const value of values) {
    const key = String(value.itemId);
    const bucket = valuesByItem.get(key);
    if (bucket) bucket.push(value);
    else valuesByItem.set(key, [value]);
  }

  const itemsWithValues = [];
  for (const item of items) {
    itemsWithValues.push({
      ...item,
      values: valuesByItem.get(String(item.id)) ?? [],
    });
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
  // Saves two round trips on an account with no collections; `.in([])` would
  // have returned nothing anyway.
  if (ids.length === 0) return [];

  // Two reads for the whole page instead of two per collection. The loop cost 2N+1 round
  // trips (measured: 4 collections = 9 statements, 2 = 5) and pulled every item column to
  // count rows the caller only wants a number for.
  const [properties, items] = await Promise.all([
    db.orm.public.CollectionProperty
      // Callback form, not `.where({ collectionId: { in: ids } })`: the shorthand
      // sends its value as a SQL literal, so an operator object there compares the
      // column against JSON text and returns 0 rows without erroring — measured,
      // and pinned by src/prisma/where-shorthand.test.ts.
      .where((m: any) => m.collectionId.in(ids))
      .where({ deletedAt: null })
      .all(),
    db.orm.public.CollectionItem.where((m: any) => m.collectionId.in(ids))
      .where({ deletedAt: null })
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
