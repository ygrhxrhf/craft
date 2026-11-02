'use server';

import { auth } from '@/lib/auth/auth';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { revalidatePath } from 'next/cache';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { notifyCommentRecipients, notifyThreadResolved } from '@/lib/notification/comment-notifications';

async function assertDocumentAccess(
  documentId: string,
  userId: string,
  need: 'viewer' | 'commenter' | 'editor',
) {
  await requireDocumentAccess(documentId, userId, need);
}

export async function createThread(
  documentId: string,
  data: { blockId?: string; blockText?: string; body: string }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const body = data.body.trim();
  if (!body) throw new Error('评论不能为空');

  const db = await getDb();
  await assertDocumentAccess(documentId, session.user.id, 'commenter');

  const threadId = crypto.randomUUID();
  await db.orm.public.CommentThread.create({
    id: threadId,
    documentId,
    blockId: data.blockId ?? null,
    blockText: (data.blockText ?? '').slice(0, 500),
  });
  const commentId = crypto.randomUUID();
  await db.orm.public.Comment.create({
    id: commentId,
    threadId,
    userId: session.user.id,
    body: body.slice(0, 2000),
  });
  // 线程 + 首条回复同批创建 → 合并一次广播
  await emitSyncEventSafe(db, session.user.id, ['comment_thread', 'comment'], threadId);
  try {
    await notifyCommentRecipients(db, {
      documentId,
      authorId: session.user.id,
      body,
      kind: 'thread',
    });
  } catch (error) {
    // A notification failure must not roll back the comment itself.
    console.error('[comment] notification delivery failed', error);
  }
  revalidatePath(`/documents/${documentId}`);
  return { threadId };
}

export async function getThreads(documentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  await assertDocumentAccess(documentId, session.user.id, 'viewer');

  // 对象式 where 不能表达 IS NULL / IN（Prisma 8 会静默返回 0 行），用字段回调。
  const threads = await db.orm.public.CommentThread
    .where((t: any) => t.documentId.eq(documentId))
    .where((t: any) => t.deletedAt.isNull())
    .orderBy((t: any) => t.createdAt.asc())
    .all();

  const live = threads.filter((thread: any) => !thread.deletedAt);
  const threadIds = live.map((thread: any) => thread.id as string);
  const comments = threadIds.length === 0
    ? []
    : await db.orm.public.Comment
      .where((c: any) => c.threadId.in(threadIds))
      .where((c: any) => c.deletedAt.isNull())
      .orderBy((c: any) => c.createdAt.asc())
      .all();

  const byThread = new Map<string, any[]>();
  for (const comment of comments as any[]) {
    if (comment.deletedAt) continue;
    const list = byThread.get(comment.threadId) ?? [];
    list.push(comment);
    byThread.set(comment.threadId, list);
  }

  return live.map((row: any) => ({
    id: row.id,
    documentId: row.documentId,
    blockId: row.blockId,
    blockText: row.blockText,
    resolved: row.resolved,
    // G74：已解决区要显示**是谁解决的**（官方 `web.collab.x.resolved`）。
    resolvedBy: row.resolvedBy ?? null,
    createdAt: row.createdAt,
    deletedAt: null,
    comments: (byThread.get(row.id) ?? []).map((c: any) => ({
      id: c.id,
      threadId: c.threadId,
      userId: c.userId,
      body: c.body,
      reactions: c.reactions ?? null,
      createdAt: c.createdAt,
      mine: c.userId === session.user.id,
      deletedAt: null,
    })),
  }));
}

export async function addReply(threadId: string, body: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const text = body.trim();
  if (!text) throw new Error('评论不能为空');

  const db = await getDb();
  const thread = await db.orm.public.CommentThread.first({ id: threadId });
  if (!thread) throw new Error('评论不存在');
  await assertDocumentAccess((thread as { documentId: string }).documentId, session.user.id, 'commenter');

  const replyId = crypto.randomUUID();
  await db.orm.public.Comment.create({
    id: replyId,
    threadId,
    userId: session.user.id,
    body: text.slice(0, 2000),
  });
  await emitSyncEventSafe(db, session.user.id, ['comment'], replyId);
  try {
    await notifyCommentRecipients(db, {
      documentId: (thread as { documentId: string }).documentId,
      authorId: session.user.id,
      body: text,
      kind: 'reply',
    });
  } catch (error) {
    console.error('[comment] notification delivery failed', error);
  }
  revalidatePath(`/documents/${(thread as { documentId: string }).documentId}`);
}

export async function setThreadResolved(threadId: string, resolved: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const thread = await db.orm.public.CommentThread.first({ id: threadId });
  if (!thread) throw new Error('评论不存在');
  await assertDocumentAccess((thread as { documentId: string }).documentId, session.user.id, 'commenter');

  await db.orm.public.CommentThread.where({ id: threadId }).update({
    resolved,
    // G74：解决时记下操作人与时刻；取消解决时两枚都清掉（"谁解决的"只在已解决态成立）。
    resolvedBy: resolved ? session.user.id : null,
    resolvedAt: resolved ? new Date().toISOString() : null,
  });
  await emitSyncEventSafe(db, session.user.id, ['comment_thread'], threadId);
  if (resolved) {
    await notifyThreadResolved(db, {
      documentId: (thread as { documentId: string }).documentId,
      resolverId: session.user.id,
    }).catch((error) => console.error('[comment] resolve notification failed', error));
  }
}

export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const comment = await db.orm.public.Comment.first({ id: commentId });
  if (!comment || (comment as { userId: string }).userId !== session.user.id) {
    throw new Error('未授权');
  }

  await db.orm.public.Comment.where({ id: commentId }).update({
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await emitSyncEventSafe(db, session.user.id, ['comment'], commentId);
}
