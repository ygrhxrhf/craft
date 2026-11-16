import { config } from 'dotenv';

config();

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { getDb } = await import('@/prisma/db');
const { getThreads } = await import('./comment');

type ThreadRows = Awaited<ReturnType<typeof getThreads>>;

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';
let documentId = '';
let liveThreadId = '';
let tombstoneThreadId = '';
let liveCommentId = '';
let otherUserId = '';

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  session.userId = userId;
  await db.orm.public.User.create({
    id: userId,
    email: `comment-read-${userId.slice(0, 8)}@example.com`,
    name: '评论读取测试',
    password: '!no-login-test-row',
  });
  documentId = crypto.randomUUID();
  await db.orm.public.Document.create({
    id: documentId,
    title: '评论读取样本',
    userId,
    content: { type: 'doc', content: [] },
  });

  liveThreadId = crypto.randomUUID();
  tombstoneThreadId = crypto.randomUUID();
  await db.orm.public.CommentThread.create({
    id: liveThreadId,
    documentId,
    blockText: '活线程',
  });
  await db.orm.public.CommentThread.create({
    id: tombstoneThreadId,
    documentId,
    blockText: '已软删线程',
    deletedAt: new Date().toISOString(),
  });
  await db.orm.public.Comment.create({
    id: crypto.randomUUID(),
    threadId: liveThreadId,
    userId,
    body: '还在',
  });
  await db.orm.public.Comment.create({
    id: crypto.randomUUID(),
    threadId: liveThreadId,
    userId,
    body: '已软删评论',
    deletedAt: new Date().toISOString(),
  });
  await db.orm.public.Comment.create({
    id: crypto.randomUUID(),
    threadId: tombstoneThreadId,
    userId,
    body: '不该出现',
  });
  // G1640：表情是每人一行。给活线程那条评论挂两行（本人一枚、别人一枚），再挂一行墓碑
  // ——读面必须按 deletedAt 过滤，且两枚都要带出现在同一条评论上。
  const liveComments = await db.orm.public.Comment.where({ threadId: liveThreadId }).all() as Record<string, any>[];
  liveCommentId = String(liveComments.find((row) => row.body === '还在')!.id);
  const otherId = crypto.randomUUID();
  await db.orm.public.User.create({
    id: otherId,
    email: `comment-other-${otherId.slice(0, 8)}@example.com`,
    name: '另一个协作者',
    password: '!no-login-test-row',
  });
  await db.orm.public.CommentReaction.create({
    id: crypto.randomUUID(), commentId: liveCommentId, userId, glyph: '👍', name: '评论读取测试',
  });
  await db.orm.public.CommentReaction.create({
    id: crypto.randomUUID(), commentId: liveCommentId, userId: otherId, glyph: '🎉', name: '另一个协作者',
  });
  await db.orm.public.CommentReaction.create({
    id: crypto.randomUUID(), commentId: liveCommentId, userId, glyph: '❤️', name: '评论读取测试',
    deletedAt: new Date().toISOString(),
  });
  otherUserId = otherId;
});

afterAll(async () => {
  if (!db) return;
  await db.orm.public.CommentReaction.where((r: { commentId: { in: (ids: string[]) => unknown } }) =>
    r.commentId.in([liveCommentId]),
  ).delete();
  await db.orm.public.Comment.where((c: { threadId: { in: (ids: string[]) => unknown } }) =>
    c.threadId.in([liveThreadId, tombstoneThreadId]),
  ).delete();
  await db.orm.public.CommentThread.where((t: { id: { in: (ids: string[]) => unknown } }) =>
    t.id.in([liveThreadId, tombstoneThreadId]),
  ).delete();
  await db.orm.public.Document.where({ id: documentId }).delete();
  await db.orm.public.User.where({ id: userId }).delete();
  if (otherUserId) await db.orm.public.User.where({ id: otherUserId }).delete();
});

describe('getThreads', () => {
  it('回调式 in / isNull 读到活评论，软删线程和评论不出现', async () => {
    const rows: ThreadRows = await getThreads(documentId);
    expect(rows.map((row: ThreadRows[number]) => row.id)).toEqual([liveThreadId]);
    expect(rows[0]?.comments.map((comment: ThreadRows[number]['comments'][number]) => comment.body)).toEqual(['还在']);
    expect(rows[0]?.comments[0]?.mine).toBe(true);
  });

  it('G1640：表情按人一行读回，墓碑行不出现', async () => {
    const rows: ThreadRows = await getThreads(documentId);
    const reactions = (rows[0]?.comments[0] as { reactions?: Array<{ glyph: string; userId: string }> })?.reactions;
    expect(reactions?.map((row) => row.glyph).sort()).toEqual(['🎉', '👍'].sort());
    expect(reactions?.find((row) => row.glyph === '🎉')?.userId).toBe(otherUserId);
  });
});
