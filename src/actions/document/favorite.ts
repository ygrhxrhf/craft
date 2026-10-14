'use server';

import { requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';

// 写侧已迁到离线内核（`src/lib/favorite/toggle-local.ts`）：收藏是元数据，
// 走 applyLocal 入队推送。这里只留读侧——服务端行是收藏页/树的权威。
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
