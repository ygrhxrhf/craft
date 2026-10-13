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
});

afterAll(async () => {
  if (!db) return;
  await db.orm.public.Comment.where((c: { threadId: { in: (ids: string[]) => unknown } }) =>
    c.threadId.in([liveThreadId, tombstoneThreadId]),
  ).delete();
  await db.orm.public.CommentThread.where((t: { id: { in: (ids: string[]) => unknown } }) =>
    t.id.in([liveThreadId, tombstoneThreadId]),
  ).delete();
  await db.orm.public.Document.where({ id: documentId }).delete();
  await db.orm.public.User.where({ id: userId }).delete();
});

describe('getThreads', () => {
  it('回调式 in / isNull 读到活评论，软删线程和评论不出现', async () => {
    const rows: ThreadRows = await getThreads(documentId);
    expect(rows.map((row: ThreadRows[number]) => row.id)).toEqual([liveThreadId]);
    expect(rows[0]?.comments.map((comment: ThreadRows[number]['comments'][number]) => comment.body)).toEqual(['还在']);
    expect(rows[0]?.comments[0]?.mine).toBe(true);
  });
});
