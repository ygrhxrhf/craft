'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { revalidatePath } from 'next/cache';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { PROPERTY_TYPE_VALUES } from '@/lib/collection/property-types';
import { convertCellValue } from '@/lib/collection/type-convert';

export async function addProperty(data: {
  collectionId: string;
  name: string;
  type: string;
  config?: any;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const collection = await db.orm.public.Collection.first({ id: data.collectionId });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }

  const properties = await db.orm.public.CollectionProperty
    .where({ collectionId: data.collectionId })
    .all();

  await db.orm.public.CollectionProperty.create({
    id: crypto.randomUUID(),
    collectionId: data.collectionId,
    name: data.name,
    type: data.type,
    config: data.config ? JSON.stringify(data.config) : null,
    order: properties.length,
    isVisible: true,
  });

  await emitSyncEventSafe(db, session.user.id, ['collection_property'], data.collectionId);
  revalidatePath(`/collections/${data.collectionId}`);
}

export async function updateProperty(
  propertyId: string,
  data: { name?: string; config?: any; isVisible?: boolean; width?: number }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const property = await db.orm.public.CollectionProperty.first({ id: propertyId });
  if (!property) return;
  const collection = await db.orm.public.Collection.first({ id: (property as any).collectionId });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
  if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
  if (data.width !== undefined) updateData.width = data.width;

  await db.orm.public.CollectionProperty.where({ id: propertyId }).update(updateData);

  await emitSyncEventSafe(db, session.user.id, ['collection_property'], propertyId);
  revalidatePath(`/collections/${(property as any).collectionId}`);
}

export async function deleteProperty(propertyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const property = await db.orm.public.CollectionProperty.first({ id: propertyId });
  if (!property) return;
  const collection = await db.orm.public.Collection.first({ id: (property as any).collectionId });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }

  await db.orm.public.CollectionValue.where({ propertyId }).update({
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await db.orm.public.CollectionProperty.where({ id: propertyId }).update({
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 属性 + 其取值同批软删 → 合并一次广播
  await emitSyncEventSafe(db, session.user.id,
    ['collection_property', 'collection_value'], propertyId);
  revalidatePath(`/collections/${(property as any).collectionId}`);
}

export async function reorderProperties(
  collectionId: string,
  propertyIds: string[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const collection = await db.orm.public.Collection.first({ id: collectionId });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }

  const properties = await db.orm.public.CollectionProperty.where({ collectionId }).all();
  const allowedIds = new Set(properties.map((property: any) => property.id));
  if (propertyIds.some((propertyId) => !allowedIds.has(propertyId))) {
    throw new Error('属性不属于该集合');
  }

  for (let i = 0; i < propertyIds.length; i++) {
    await db.orm.public.CollectionProperty
      .where({ id: propertyIds[i] })
      .update({ order: i });
  }

  await emitSyncEventSafe(db, session.user.id, ['collection_property'], collectionId);
  revalidatePath(`/collections/${collectionId}`);
}

function decodeStored(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw ?? null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * G299：改字段类型时尽力转换现有值（官方「如果可以转换，修改字段类型将会转换当前值。」）。
 * 转不了的写 null，而不是把整列清空；配置与名称不动。
 */
export async function changePropertyType(propertyId: string, type: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const property = await db.orm.public.CollectionProperty.first({ id: propertyId });
  if (!property) return;
  const collection = await db.orm.public.Collection.first({ id: (property as any).collectionId });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }

  const nextType = type.trim();
  if (!PROPERTY_TYPE_VALUES.has(nextType)) throw new Error('无效的字段类型');
  if ((property as any).type === nextType) return;

  await db.orm.public.CollectionProperty.where({ id: propertyId }).update({ type: nextType });

  const values = await db.orm.public.CollectionValue.where({ propertyId }).all();
  for (const row of values) {
    if ((row as any).deletedAt) continue;
    const converted = convertCellValue(decodeStored((row as any).value), nextType);
    await db.orm.public.CollectionValue.where({ id: (row as any).id }).update({
      value: converted === null || converted === undefined ? null : JSON.stringify(converted),
    });
  }

  await emitSyncEventSafe(db, session.user.id, ['collection_property', 'collection_value'], propertyId);
  revalidatePath(`/collections/${(property as any).collectionId}`);
}
