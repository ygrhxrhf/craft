'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { revalidatePath } from 'next/cache';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { PROPERTY_TYPE_VALUES } from '@/lib/collection/property-types';
import { convertCellValue } from '@/lib/collection/type-convert';
import { parseCellValue, toTypedValue } from '@/lib/collection/cell-value';
import { backColumnOf } from '@/lib/collection/two-way-relation';
import { relationTargetId } from '@/lib/collection/relation-value';
import { COLLECTION_COLUMN_LIMIT_MESSAGE, canAddColumn } from '@/lib/collection/limits';

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

  // G690：20 列上限是校验层拒绝，标题列不计入。
  if (!canAddColumn(properties.length)) throw new Error(COLLECTION_COLUMN_LIMIT_MESSAGE);

  await db.orm.public.CollectionProperty.create({
    id: crypto.randomUUID(),
    collectionId: data.collectionId,
    name: data.name,
    type: data.type,
    config: data.config ? JSON.stringify(data.config) : null,
    order: properties.length,
    isVisible: true,
  });

  // G285: a two-way relation also creates the **back column** on the target collection — one
  // pointing here — so both sides see each other. Only for a configured relation with `twoWay`.
  const back = data.type === 'relation' ? backColumnOf({
    collectionId: data.collectionId,
    targetCollectionId: relationTargetId(data.config ? JSON.stringify(data.config) : null) ?? '',
    twoWay: Boolean((data.config as { twoWay?: unknown } | undefined)?.twoWay),
    backFieldName: (data.config as { backFieldName?: string } | undefined)?.backFieldName ?? null,
  }) : null;
  if (back) {
    const target = await db.orm.public.Collection.first({ id: back.collectionId });
    if (target && (target as any).userId === session.user.id) {
      const targetProps = await db.orm.public.CollectionProperty
        .where({ collectionId: back.collectionId })
        .all();
      if (!canAddColumn(targetProps.length)) {
        throw new Error(COLLECTION_COLUMN_LIMIT_MESSAGE);
      }
      await db.orm.public.CollectionProperty.create({
        id: crypto.randomUUID(),
        collectionId: back.collectionId,
        name: back.backFieldName ?? '关联',
        type: 'relation',
        config: JSON.stringify({ objectListId: data.collectionId, twoWay: true }),
        order: targetProps.length,
        isVisible: true,
      });
      await emitSyncEventSafe(db, session.user.id, ['collection_property'], back.collectionId);
      revalidatePath(`/collections/${back.collectionId}`);
    }
  }

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
    // 读侧先解包（G451）：存的是 `{type, theme, value}`，直接送进 convert 会把整个对象当值。
    const converted = convertCellValue(parseCellValue((row as any).value), nextType);
    const typed = toTypedValue(nextType, converted);
    await db.orm.public.CollectionValue.where({ id: (row as any).id }).update({
      value: typed.value == null ? null : JSON.stringify(typed),
    });
  }

  await emitSyncEventSafe(db, session.user.id, ['collection_property', 'collection_value'], propertyId);
  revalidatePath(`/collections/${(property as any).collectionId}`);
}
