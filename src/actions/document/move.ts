'use server';

import { auth } from '@/lib/auth/auth';
import { requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

export async function moveDocument(id: string, data: {
  parentId?: string | null;
  folderId?: string | null;
  order?: number;
}) {
  const userId = await requireUserId();
  await requireDocumentAccess(id, userId, 'editor');

  const db = await getDb();
  // parentId/folderId/order 均属 DOC_META_COLS → bump metaUpdatedAt 才进增量流
  const now = new Date().toISOString();
  await db.orm.public.Document
    .where({ id })
    .update({ ...data, metaUpdatedAt: now } as Record<string, unknown>);
  await emitSyncEventSafe(db, userId, ['document'], id);
}
