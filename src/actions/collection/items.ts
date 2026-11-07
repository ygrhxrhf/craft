'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { revalidatePath } from 'next/cache';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { toTypedValue } from '@/lib/collection/cell-value';
import { validateMultiSelect, validateSelect } from '@/lib/collection/value-validation';
import { normalizeCellValue } from '@/lib/collection/cell-edit';
import { coerceTextForType } from '@/lib/collection/coerce';
import { addMembership, removeMembership } from '@/lib/collection/object-membership';

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
    // G427: a new item starts with its primary collection in the membership array, so a later
    // "add to another collection" only appends to `schemas` instead of backfilling from null.
    schemas: [collectionId],
    order: maxOrder + 1,
  });

  await emitSyncEventSafe(db, session.user.id, ['collection_item'], itemId);
  revalidatePath(`/collections/${collectionId}`);
  return { id: itemId, collectionId, order: maxOrder + 1 };
}

/**
 * G834: duplicate a row. Values are copied as-is (the official `collections.duplicate.row`
 * copies the record, not a link), and the copy joins the same collection memberships.
 */
export async function duplicateItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();

  const item = await db.orm.public.CollectionItem.first({ id: itemId });
  if (!item) throw new Error('项目不存在');

  const collectionId = String((item as any).collectionId ?? '');
  const collection = await db.orm.public.Collection.first({ id: collectionId });
  if (!collection || (collection as any).userId !== session.user.id) {
    throw new Error('集合不存在');
  }

  const items = await db.orm.public.CollectionItem.where({ collectionId }).all();
  const maxOrder = items.reduce((max: number, row: any) => Math.max(max, row.order ?? 0), -1);

  const newId = crypto.randomUUID();
  await db.orm.public.CollectionItem.create({
    id: newId,
    collectionId,
    schemas: (item as any).schemas ?? [collectionId],
    order: maxOrder + 1,
  });

  // Copy values in the typed `{type, theme, value}` shape used by `setItemValue` and import.
  // Writing the decoded bare value back fails on read: the ORM's pg/json codec parses a stored
  // JSON string again, so a plain string value cannot be decoded after INSERT ... RETURNING.
  const properties = (await db.orm.public.CollectionProperty.where({ collectionId }).all()) as any[];
  const typeByPropertyId = new Map(
    properties.map((property) => [String(property.id), String(property.type ?? 'text')]),
  );

  const values = await db.orm.public.CollectionValue.where({ itemId }).all();
  for (const value of values as any[]) {
    if (value.deletedAt) continue;
    const propType = typeByPropertyId.get(String(value.propertyId)) ?? 'text';
    await db.orm.public.CollectionValue.create({
      id: crypto.randomUUID(),
      itemId: newId,
      propertyId: value.propertyId,
      value: toTypedValue(propType, value.value ?? null),
    });
  }

  await emitSyncEventSafe(db, session.user.id, ['collection_item', 'collection_value'], newId);
  revalidatePath(`/collections/${collectionId}`);
  return { id: newId, collectionId, order: maxOrder + 1 };
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

  // G451: store the typed discriminant `{type, theme, value}` so a null still says which type of
  // empty it is. The column is Json, so the object is stored as-is (JSON.stringify keeps the shape
  // the read side's `rawValueOf` expects).
  // G395: select／multiSelect 先过一遍"每个元素都得在选项集内"的校验——**一个越界值就把整格判否**，
  // 不是过滤掉坏值后照样存（那样脏值会被静默吞掉）。
  const propType = String((property as any).type ?? 'text');
  const isMulti = propType === 'multi_select' || propType === 'multiSelect';
  // G452：空只有一种形态——空串／纯空格、空数组、items 为空的关联对象都先收敛成 null。
  let normalizedValue = normalizeCellValue(value);
  // G92：勾选框只认 true/false 白名单；日期非法静默丢弃（整格不落值）。
  if (typeof normalizedValue === 'string' && (propType === 'checkbox' || propType === 'date' || propType === 'datetime')) {
    const coerced = coerceTextForType(propType, normalizedValue);
    normalizedValue = coerced.ok ? coerced.value : null;
  }
  if (propType === 'select' || isMulti) {
    const optionIds = readOptionIds((property as any).config);
    const check = isMulti
      ? validateMultiSelect({ optionIds, value: normalizedValue })
      : validateSelect({ optionIds, value: normalizedValue });
    if (!check.ok) throw new Error('选项不在该字段的候选项内');
  }
  const typed = toTypedValue(propType, normalizedValue);
  const stored = typed.value != null ? JSON.stringify(typed) : null;

  if (existing.length > 0) {
    await db.orm.public.CollectionValue.where({ id: (existing[0] as any).id }).update({
      value: stored,
    });
  } else {
    await db.orm.public.CollectionValue.create({
      id: crypto.randomUUID(),
      itemId,
      propertyId,
      value: stored,
    });
  }

  await emitSyncEventSafe(db, session.user.id, ['collection_value'], itemId);
  revalidatePath(`/collections/${(item as any).collectionId}`);
}

/** 从属性行的 `config`（JSON 串或对象）里取选项 id 集；取不到给空集（空集下任何值都判否）。 */
function readOptionIds(config: unknown): string[] {
  let parsed: unknown = config;
  if (typeof config === 'string') {
    try { parsed = JSON.parse(config); } catch { return []; }
  }
  const options = (parsed as { options?: unknown })?.options;
  if (!Array.isArray(options)) return [];
  return options.map((o) => String((o as { id?: unknown })?.id ?? '')).filter(Boolean);
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

/**
 * G427: put an existing item into another collection too — the item keeps its row and values, and
 * the second collection is appended to its membership array. Nothing is copied, so editing the
 * item from either collection edits the same record.
 */
export async function addItemToCollection(itemId: string, collectionId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const item = await db.orm.public.CollectionItem.first({ id: itemId });
  if (!item) throw new Error('项目不存在');

  const target = await db.orm.public.Collection.first({ id: collectionId });
  if (!target || (target as any).userId !== session.user.id) throw new Error('集合不存在');

  const row = item as Record<string, unknown>;
  const current = normalizeSchemas(row.schemas, String(row.collectionId ?? ''));
  const membership = addMembership({ schemas: current, objectSchemaId: null }, collectionId);

  await db.orm.public.CollectionItem.where({ id: itemId }).update({
    schemas: membership.schemas,
    updatedAt: new Date().toISOString(),
  });
  await emitSyncEventSafe(db, session.user.id, ['collection_item'], itemId);
  revalidatePath(`/collections/${collectionId}`);
}

/**
 * G289：把一行移出某个集合（官方 `move.out.item.beta`）。只摘归属、不删对象：
 * 还有别的集合就换主集合继续存在；这是最后一项归属时才随行删除。
 */
export async function removeItemFromCollection(itemId: string, collectionId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const item = await db.orm.public.CollectionItem.first({ id: itemId });
  if (!item) throw new Error('项目不存在');
  const collection = await db.orm.public.Collection.first({ id: collectionId });
  if (!collection || (collection as any).userId !== session.user.id) throw new Error('集合不存在');

  const row = item as Record<string, unknown>;
  const current = normalizeSchemas(row.schemas, String(row.collectionId ?? ''));
  const next = removeMembership({ schemas: current, objectSchemaId: null }, collectionId).schemas;

  if (next.length === 0) {
    await deleteItem(itemId);
    return;
  }

  const primary = String(row.collectionId ?? '');
  await db.orm.public.CollectionItem.where({ id: itemId }).update({
    schemas: next,
    collectionId: primary === collectionId ? next[0] : primary,
    updatedAt: new Date().toISOString(),
  });
  await emitSyncEventSafe(db, session.user.id, ['collection_item'], itemId);
  revalidatePath(`/collections/${collectionId}`);
}

/** G427: a row's membership array; a missing/invalid value reads as the single `collectionId`. */
function normalizeSchemas(raw: unknown, fallback?: string): string[] {  if (Array.isArray(raw)) return raw.filter((value): value is string => typeof value === 'string');
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
