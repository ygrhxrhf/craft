'use server';

import { requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';

export async function toggleFavorite(documentId: string) {
  const userId = await requireUserId();
  await requireDocumentAccess(documentId, userId, 'viewer');

  const db = await getDb();
  const existing = (await db.orm.public.Favorite.first({
    userId: userId,
    documentId,
  })) as { id: string; deletedAt?: string | null } | null;

  if (existing && !existing.deletedAt) {
    // 已收藏 → 取消收藏：写墓碑而非物理删除（对增量同步可见）
    await db.orm.public.Favorite.where({ id: existing.id }).update({
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return false;
  }

  if (existing) {
    // 含墓碑的旧行命中：清墓碑复用（唯一键 [userId, documentId] 不加 deletedAt 后缀）
    await db.orm.public.Favorite.where({ id: existing.id }).update({
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    });
  } else {
    await db.orm.public.Favorite.create({
      id: crypto.randomUUID(),
      userId: userId,
      documentId,
    });
  }
  return true;
}

export async function isDocumentFavorite(documentId: string) {
  const userId = await requireUserId();
  await requireDocumentAccess(documentId, userId, 'viewer');

  const db = await getDb();
  const existing = await db.orm.public.Favorite.first({
    userId: userId,
    documentId,
    deletedAt: null,
  });
  return !!existing;
}

