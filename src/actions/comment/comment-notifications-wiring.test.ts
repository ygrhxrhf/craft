import { config } from 'dotenv';

config();

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { getDb } = await import('@/prisma/db');
const { createThread, addReply } = await import('./comment');

let db: Awaited<ReturnType<typeof getDb>>;
let ownerId = '';
let authorId = '';
let documentId = '';

async function ownerNotifications() {
  return db.orm.public.Notification.where({ userId: ownerId }).all() as Promise<Record<string, unknown>[]>;
}

async function clearNotifications() {
  for (const userId of [ownerId, authorId]) {
    const rows = await db.orm.public.Notification.where({ userId }).all();
    for (const row of rows) await db.orm.public.Notification.where({ id: String(row.id) }).delete();
  }
}

async function clearComments() {
  const threads = await db.orm.public.CommentThread.where({ documentId }).all();
  for (const thread of threads) {
    const comments = await db.orm.public.Comment.where({ threadId: String(thread.id) }).all();
    for (const comment of comments) {
      await db.orm.public.Comment.where({ id: String(comment.id) }).delete();
    }
    await db.orm.public.CommentThread.where({ id: String(thread.id) }).delete();
  }
}

beforeAll(async () => {
  db = await getDb();
  ownerId = crypto.randomUUID();
  authorId = crypto.randomUUID();
  for (const [id, name] of [[ownerId, '所有者'], [authorId, '评论者']] as const) {
    await db.orm.public.User.create({
      id,
      email: `g03-wiring-${id.slice(0, 8)}@example.com`,
      name,
      password: '!no-login-test-row',
    });
  }

  documentId = crypto.randomUUID();
  await db.orm.public.Document.create({
    id: documentId,
    title: '评论接线样本',
    userId: ownerId,
    content: { type: 'doc', content: [] },
  });
  await db.orm.public.DocumentMember.create({
    id: crypto.randomUUID(),
    documentId,
    userId: authorId,
    role: 'commenter',
  });
  session.userId = authorId;
});

beforeEach(async () => {
  await clearNotifications();
  await clearComments();
  await db.orm.public.User.where({ id: ownerId }).update({ notifyComments: true });
});

afterAll(async () => {
  await clearNotifications();
  await clearComments();
  await db.orm.public.DocumentMember.where({ documentId }).delete();
  await db.orm.public.Document.where({ id: documentId }).delete();
  for (const id of [ownerId, authorId]) {
    await db.orm.public.User.where({ id }).delete();
  }
});

describe('comment actions wire the notification switch', () => {
  it('createThread notifies the other reader', async () => {
    await createThread(documentId, { body: '新评论' });
    const rows = await ownerNotifications();
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('<username>评论者</username> 评论了<highlight>「评论接线样本」</highlight>');
  });

  it('addReply notifies with reply wording', async () => {
    const { threadId } = await createThread(documentId, { body: '新评论' });
    await clearNotifications();
    await addReply(threadId, '回复一下');
    const rows = await ownerNotifications();
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('<username>评论者</username> 回复了<highlight>「评论接线样本」</highlight>中的评论');
  });

  it('does not notify when the recipient switch is off', async () => {
    await db.orm.public.User.where({ id: ownerId }).update({ notifyComments: false });
    await createThread(documentId, { body: '关掉通知' });
    expect(await ownerNotifications()).toHaveLength(0);
  });
});
