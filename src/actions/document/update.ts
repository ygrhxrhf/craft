'use server';

import { requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { DOC_META_COLS } from '@/lib/sync/tables';
import { emitSyncEvent } from '@/lib/sync/emit-event';

export async function updateDocument(id: string, data: {
  title?: string;
  content?: unknown;
  plainText?: string;
  icon?: string | null;
  coverImage?: string | null;
  coverType?: string | null;
  wordCount?: number;
  charCount?: number;
  version?: number;
  font?: string | null;
  width?: string | null;
  pageStyle?: unknown;
}) {
  const userId = await requireUserId();
  await requireDocumentAccess(id, userId, 'editor');

  const db = await getDb();

  // Spec 4.2/5.6: only metadata field changes bump metaUpdatedAt (the document
  // incremental-sync timestamp) and broadcast; content-only saves must not.
  const incoming = Object.keys(data);
  const touchesMeta = incoming.some(k => (DOC_META_COLS as readonly string[]).includes(k));
  const payload: Record<string, unknown> = { ...data };
  let metaTs = '';
  if (touchesMeta) {
    metaTs = new Date().toISOString();
    payload.metaUpdatedAt = metaTs;
  }
  const doc = await db.orm.public.Document.where({ id }).update(payload);

  // Auto version snapshot: at most one per 10 minutes per document
  try {
    const latest = await db.orm.public.DocumentVersion
      .where({ documentId: id })
      .orderBy((v: any) => v.version.desc())
      .limit(1)
      .all();
    const last = latest[0] as any;
    const stale = !last || Date.now() - new Date(last.createdAt).getTime() >= 10 * 60 * 1000;
    if (stale && data.content !== undefined) {
      const current = await db.orm.public.Document.first({ id });
      const c = current as any;
      if (c) {
        await db.orm.public.DocumentVersion.create({
          id: crypto.randomUUID(),
          documentId: id,
          version: last ? last.version + 1 : 1,
          title: c.title,
          content: c.content,
          plainText: c.plainText,
          wordCount: c.wordCount,
        });
      }
    }
  } catch {
    // version snapshot must never block saving
  }

  // Metadata change → broadcast; failure never blocks saving (same posture as
  // the version snapshot above).
  if (touchesMeta) {
    try {
      await emitSyncEvent(db, userId, ['document'], { ts: metaTs, id });
    } catch {
      // broadcast failure must never block saving
    }
  }

  return doc;
}
