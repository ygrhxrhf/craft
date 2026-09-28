'use server';

import { assertOwned, requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { normalizeTagColor, normalizeTagName } from '@/lib/tag/normalize';

export interface TagRecord {
  id: string;
  name: string;
  color: string;
  documentCount?: number;
}

export async function getTags(): Promise<TagRecord[]> {
  const userId = await requireUserId();
  const db = await getDb();
  const tags = (await db.orm.public.Tag.where({ userId }).all()) as (TagRecord & {
    documents?: unknown[];
  })[];

  return tags.map(({ documents, ...tag }) => ({ ...tag }));
}

export async function getDocumentTags(documentId: string): Promise<TagRecord[]> {
  const userId = await requireUserId();
  await requireDocumentAccess(documentId, userId, 'viewer');

  const db = await getDb();
  const links = (await db.orm.public.DocumentTag.where({ documentId }).all()) as {
    tagId: string;
  }[];
  if (links.length === 0) return [];

  const tags = (await db.orm.public.Tag.where({ userId }).all()) as TagRecord[];
  const wanted = new Set(links.map((link) => link.tagId));
  return tags.filter((tag) => wanted.has(tag.id));
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
    }
    return found;
  }

  const created = (await db.orm.public.Tag.create({
    id: crypto.randomUUID(),
    userId,
    name: normalized,
    color: normalizeTagColor(color),
  })) as TagRecord;

  return created;
}

export async function attachTag(documentId: string, name: string, color?: string) {
  const userId = await requireUserId();
  await requireDocumentAccess(documentId, userId, 'editor');

  const tag = await findOrCreateTag(userId, name, color);
  if (!tag) return null;

  const db = await getDb();
  const link = await db.orm.public.DocumentTag.first({ documentId, tagId: tag.id });
  if (link) {
    // 含墓碑的旧行命中：清墓碑复用（@@id([documentId, tagId]) 不带 deletedAt）
    await db.orm.public.DocumentTag
      .where({ documentId, tagId: tag.id })
      .update({ deletedAt: null, updatedAt: new Date().toISOString() });
  } else {
    await db.orm.public.DocumentTag.create({
      documentId, tagId: tag.id, createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
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

export async function getDocumentsByTag(tagId: string) {
  const userId = await requireUserId();
  await assertOwned('Tag', tagId, userId, '标签不存在');

  const db = await getDb();
  const links = (await db.orm.public.DocumentTag.where({ tagId }).all()) as {
    documentId: string;
  }[];
  if (links.length === 0) return [];

  const documents = (await db.orm.public.Document.where({ userId }).all()) as Record<
    string,
    unknown
  >[];
  const wanted = new Set(links.map((link) => link.documentId));
  return documents
    .filter((doc) => wanted.has(doc.id as string) && doc.isDeleted !== true)
    .map((doc) => ({ id: doc.id, title: doc.title, icon: doc.icon })) as {
    id: string;
    title: string;
    icon: string | null;
  }[];
}
