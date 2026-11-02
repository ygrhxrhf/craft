'use server';

import { requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

/**
 * G93: archive/unarchive is a document boolean, not a move. An archived document leaves the normal
 * lists but keeps its place, members and share links; the archive view is where it comes back from.
 */
export async function setDocumentArchived(id: string, archived: boolean): Promise<void> {
  const userId = await requireUserId();
  await requireDocumentAccess(id, userId, 'editor');

  const db = await getDb();
  await db.orm.public.Document.where({ id }).update({
    isArchived: archived,
    metaUpdatedAt: new Date().toISOString(),
  });
  await emitSyncEventSafe(db, userId, ['document'], id);
}
