'use server';

import { assertOwned, requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { normalizeTagColor, normalizeTagName } from '@/lib/tag/normalize';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

export interface TagRecord {
  id: string;
  name: string;
  color: string;
  order?: number;
  pinned?: boolean;
  documentCount?: number;
}

export async function getTags(): Promise<TagRecord[]> {
  const userId = await requireUserId();
  const db = await getDb();
  const tags = (await db.orm.public.Tag.where({ userId, deletedAt: null })
    .orderBy((m: { order: { asc: () => unknown } }) => m.order.asc())
    .all()) as (TagRecord & {
    documents?: unknown[];
  })[];

  return tags.map(({ documents, ...tag }) => ({ ...tag }));
}

export async function getDocumentTags(documentId: string): Promise<TagRecord[]> {
  const userId = await requireUserId();
  await requireDocumentAccess(documentId, userId, 'viewer');

  const db = await getDb();
  const links = (await db.orm.public.DocumentTag.where({ documentId, deletedAt: null }).all()) as {
    tagId: string;
  }[];
  if (links.length === 0) return [];

  const tags = (await db.orm.public.Tag.where({ userId, deletedAt: null }).all()) as TagRecord[];
  const wanted = new Set(links.map((link) => link.tagId));
  return tags.filter((tag) => wanted.has(tag.id));
}

/**
 * The raw material for the tags collection (`/tags`, G47): every live tag of this user plus every
 * live document↔tag link. Documents are joined by the caller from `getDocuments()`, which is the
 * read that already excludes deleted/daily/template pages, so a count can never be inflated by a
 * page the actor cannot open.
 */
export async function getTagBrowseRows(): Promise<{
  tags: TagRecord[];
  links: { tagId: string; documentId: string }[];
}> {
  const userId = await requireUserId();
  const db = await getDb();
  const tags = (await db.orm.public.Tag.where({ userId, deletedAt: null })
    .orderBy((m: { order: { asc: () => unknown } }) => m.order.asc())
    .all()) as TagRecord[];
  const owned = new Set(tags.map((tag) => tag.id));
  const rows = (await db.orm.public.DocumentTag.where({ deletedAt: null }).all()) as {
    tagId: string;
    documentId: string;
  }[];
  return { tags, links: rows.filter((row) => owned.has(row.tagId)) };
}

/** Finds the user's tag by normalised name, creating it on first use. */
async function findOrCreateTag(userId: string, name: string, color?: string) {
  const normalized = normalizeTagName(name);
  if (!normalized) return null;

  const db = await getDb();
  const found = (await db.orm.public.Tag.first({ name: normalized, userId })) as
    | (TagRecord & { deletedAt?: string | null })
    | null;
  if (found) {
    // 同名重建：命中含墓碑的旧行 → 清墓碑复用旧 id（唯一键 [name, userId] 不加 deletedAt 后缀）
    if (found.deletedAt) {
      await db.orm.public.Tag.where({ id: found.id }).update({
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      });
      await emitSyncEventSafe(db, userId, ['tag'], found.id);
    }
    return found;
  }

  const created = (await db.orm.public.Tag.create({
    id: crypto.randomUUID(),
    userId,
    name: normalized,
    color: normalizeTagColor(color),
    // 新标签排到已有顺序之后；整批重排会把它改回 0…n-1。
    order: Date.now(),
  })) as TagRecord;

  await emitSyncEventSafe(db, userId, ['tag'], created.id);
  return created;
}

export async function attachTag(documentId: string, name: string, color?: string) {
  const userId = await requireUserId();
  await requireDocumentAccess(documentId, userId, 'editor');

  const tag = await findOrCreateTag(userId, name, color);
  if (!tag) return null;

  const db = await getDb();
  const link = await db.orm.public.DocumentTag.first({ documentId, tagId: tag.id });
  if (link && link.deletedAt) {
    // 含墓碑的旧行命中：清墓碑复用（@@id([documentId, tagId]) 不带 deletedAt）
    await db.orm.public.DocumentTag
      .where({ documentId, tagId: tag.id })
      .update({ deletedAt: null, updatedAt: new Date().toISOString() });
    await emitSyncEventSafe(db, userId, ['document_tag'], `${documentId}__${tag.id}`);
  } else if (!link) {
    await db.orm.public.DocumentTag.create({
      documentId, tagId: tag.id, createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await emitSyncEventSafe(db, userId, ['document_tag'], `${documentId}__${tag.id}`);
  }
  // 活行命中：no-op（不 bump updatedAt，避免未变更行产生重复 sync 事件）
  return tag;
}

export async function detachTag(documentId: string, tagId: string) {
  const userId = await requireUserId();
  await requireDocumentAccess(documentId, userId, 'editor');
  await assertOwned('Tag', tagId, userId, '标签不存在');

  const db = await getDb();
  const link = await db.orm.public.DocumentTag.first({ documentId, tagId });
  if (link) {
    await db.orm.public.DocumentTag
      .where({ documentId, tagId })
      .update({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  return true;
}

export async function renameTag(tagId: string, name: string, color?: string) {
  const userId = await requireUserId();
  await assertOwned('Tag', tagId, userId, '标签不存在');

  const normalized = normalizeTagName(name);
  if (!normalized) return null;

  const db = await getDb();
  const clash = (await db.orm.public.Tag.where({ userId }).all()) as TagRecord[];
  if (clash.some((tag) => tag.id !== tagId && tag.name === normalized)) {
    throw new Error('同名标签已存在');
  }

  return (await db.orm.public.Tag.where({ id: tagId }).update({
    name: normalized,
    ...(color ? { color: normalizeTagColor(color) } : {}),
  })) as TagRecord;
}

export async function deleteTag(tagId: string) {
  const userId = await requireUserId();
  await assertOwned('Tag', tagId, userId, '标签不存在');

  const db = await getDb();
  await db.orm.public.Tag.where({ id: tagId }).update({
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return true;
}
