'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { untitledFor } from '@/lib/document/untitled-copy';

export async function saveAsTemplate(documentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const doc = await db.orm.public.Document.first({ id: documentId });
  if (!doc || (doc as any).userId !== session.user.id) throw new Error('未授权');
  const d = doc as any;

  const metaTs = new Date().toISOString();
  const copy = await db.orm.public.Document.create({
    id: crypto.randomUUID(),
    title: `${d.title || untitledFor('list')} 模板`,
    icon: d.icon,
    content: d.content,
    plainText: d.plainText,
    pageStyle: d.pageStyle,
    font: d.font,
    width: d.width,
    userId: session.user.id,
    isTemplate: true,
    // No DB default on metaUpdatedAt; without it new rows never enter the
    // incremental-sync stream (document tsCol is metaUpdatedAt).
    metaUpdatedAt: metaTs,
  });

  await emitSyncEventSafe(db, session.user.id, ['document'], (copy as any).id ?? metaTs);
  return copy;
}
