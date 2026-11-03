'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { buildTaskItemBlock } from '@/lib/task/task-block';
import { getOrCreateDayNote } from '@/actions/daily-notes/daily-notes';

/**
 * G1529：把一条任务移到某篇文档或今天的每日笔记里。
 *
 * 本地只有"未归属文档"的任务能整行搬走——正文里的任务块属于那篇文档，挪它得改块树，
 * 不在这条动作的语义里（动作会明确拒绝）。
 */
export async function moveTaskToDocument(
  taskId: string,
  target: { documentId: string } | { dailyNote: true },
): Promise<{ documentId: string; documentTitle: string | null }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const db = await getDb();

  const task = await db.orm.public.Task.first({
    id: taskId,
    userId: session.user.id,
    deletedAt: null,
  });
  if (!task) throw new Error('任务不存在');
  const source = task as { documentId?: string | null; title?: string; isCompleted?: boolean; status?: string };
  if (source.documentId) throw new Error('该任务已在文档中');

  let documentId: string;
  let documentTitle: string | null = null;
  if ('dailyNote' in target) {
    const note = await getOrCreateDayNote(0);
    documentId = String((note as { id: string }).id);
  } else {
    const doc = await db.orm.public.Document.first({ id: target.documentId });
    if (!doc || (doc as { userId?: string }).userId !== session.user.id || (doc as { isDeleted?: boolean }).isDeleted) {
      throw new Error('目标文档不存在');
    }
    documentId = String((doc as { id: string }).id);
    documentTitle = String((doc as { title?: unknown }).title ?? '');
  }

  const doc = await db.orm.public.Document.first({ id: documentId });
  if (!doc) throw new Error('目标文档不存在');
  const content = ((doc as { content?: unknown }).content as { type?: string; content?: unknown[] }) ?? {};
  const block = buildTaskItemBlock({
    title: String(source.title ?? ''),
    isCompleted: source.isCompleted === true,
    status: (source.status as 'todo' | 'done' | 'cancelled') ?? 'todo',
  });
  const nextContent = {
    ...content,
    type: 'doc',
    content: [...(content.content ?? []), block],
  };
  const now = new Date().toISOString();
  const plainText = `${String((doc as { plainText?: unknown }).plainText ?? '')}\n${String(source.title ?? '')}`.trim();

  await db.orm.public.Document.where({ id: documentId }).update({
    content: nextContent,
    plainText,
    metaUpdatedAt: now,
    updatedAt: now,
  });
  await db.orm.public.Task.where({ id: taskId }).update({ deletedAt: now, updatedAt: now });
  await emitSyncEventSafe(db, session.user.id, ['document', 'task'], documentId);

  return { documentId, documentTitle };
}
