'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

export async function createDocument(input: {
  title?: string;
  parentId?: string | null;
  folderId?: string | null;
  isTemplate?: boolean;
  isDailyNote?: boolean;
  dailyNoteDate?: string | null;
  useTemplateId?: string | null;
  duplicateFrom?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();

  type SourceDoc = {
    id: string;
    userId: string;
    title: string;
    icon: string | null;
    coverImage: string | null;
    coverType: string | null;
    content: unknown;
    plainText: string;
    width: string | null;
    pageStyle: unknown;
    folderId: string | null;
    isTemplate?: boolean;
  };

  let base: SourceDoc | null = null;
  if (input.useTemplateId) {
    const tpl = await db.orm.public.Document.first({ id: input.useTemplateId });
    if (tpl && (tpl as SourceDoc).userId === session.user.id && (tpl as SourceDoc).isTemplate) {
      base = tpl as SourceDoc;
    }
  }

  const creatingCopy = !!input.duplicateFrom;
  if (creatingCopy && !base) {
    const source = await db.orm.public.Document.first({ id: input.duplicateFrom });
    if (source && (source as SourceDoc).userId === session.user.id) {
      base = source as SourceDoc;
    }
  }
  if (creatingCopy && !base) throw new Error('原文档不存在');

  const sourceDoc = base as SourceDoc;
  const title = creatingCopy
    ? `${sourceDoc.title} 副本`
    : (input.title ?? (sourceDoc?.title ?? ''));

  // New rows must carry metaUpdatedAt or they never enter the incremental-sync
  // stream (document tsCol is metaUpdatedAt and has no DB default).
  const now = new Date().toISOString();
  // G236：从模板新建时在页面样式里留一枚「来自模板」的来源标记（模板 id）。
  const basePageStyle = sourceDoc ? (sourceDoc.pageStyle ?? null) : null;
  const pageStyle = input.useTemplateId
    ? {
        ...(basePageStyle && typeof basePageStyle === 'object' ? basePageStyle : {}),
        fromTemplate: input.useTemplateId,
      }
    : basePageStyle;
  const doc = await db.orm.public.Document.create({
    id: crypto.randomUUID(),
    title,
    userId: session.user.id,
    parentId: creatingCopy ? null : (input.parentId ?? null),
    folderId: creatingCopy ? (sourceDoc?.folderId ?? null) : (input.folderId ?? null),
    icon: sourceDoc ? sourceDoc.icon : null,
    coverImage: sourceDoc?.coverImage ?? null,
    coverType: sourceDoc?.coverType ?? null,
    content: sourceDoc ? (sourceDoc.content ?? null) : null,
    plainText: sourceDoc ? sourceDoc.plainText : '',
    width: sourceDoc?.width ?? null,
    pageStyle,
    isTemplate: input.isTemplate ?? false,
    isDailyNote: false,
    dailyNoteDate: input.dailyNoteDate ?? null,
    metaUpdatedAt: now,
  });

  await emitSyncEventSafe(db, session.user.id, ['document'], (doc as any).id ?? now);
  return doc;
}
