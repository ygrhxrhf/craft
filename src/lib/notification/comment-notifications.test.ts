import { config } from 'dotenv';

config();

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const { getDb } = await import('@/prisma/db');
const {
  notifyCommentRecipients,
  mentionHandles,
  mentionsUser,
  commentNotificationTitle,
} = await import('./comment-notifications');

let db: Awaited<ReturnType<typeof getDb>>;
let ownerId = '';
let authorId = '';
let documentId = '';

async function notificationsFor(userId: string) {
  return db.orm.public.Notification.where({ userId }).all() as Promise<Record<string, unknown>[]>;
}

async function clearNotifications() {
  for (const userId of [ownerId, authorId]) {
    const rows = await notificationsFor(userId);
    for (const row of rows) await db.orm.public.Notification.where({ id: String(row.id) }).delete();
  }
}

beforeAll(async () => {
  db = await getDb();
  ownerId = crypto.randomUUID();
  authorId = crypto.randomUUID();
  for (const [id, name] of [[ownerId, '所有者'], [authorId, '评论者']] as const) {
    await db.orm.public.User.create({
      id,
      email: `g03-comment-${id.slice(0, 8)}@example.com`,
      name,
      password: '!no-login-test-row',
    });
  }

  documentId = crypto.randomUUID();
  await db.orm.public.Document.create({
    id: documentId,
    title: '评论通知样本',
    userId: ownerId,
    content: { type: 'doc', content: [] },
  });
  await db.orm.public.DocumentMember.create({
    id: crypto.randomUUID(),
    documentId,
    userId: authorId,
    role: 'commenter',
  });
});

beforeEach(async () => {
  await clearNotifications();
  await db.orm.public.User.where({ id: ownerId }).update({ notifyComments: true });
  await db.orm.public.User.where({ id: authorId }).update({ notifyComments: true });
});

afterAll(async () => {
  await clearNotifications();
  await db.orm.public.DocumentMember.where({ documentId }).delete();
  await db.orm.public.Document.where({ id: documentId }).delete();
  for (const id of [ownerId, authorId]) {
    await db.orm.public.User.where({ id }).delete();
  }
});

describe('comment notification helpers', () => {
  it('reads the name and email-local handles', () => {
    const user = { name: '张三', email: 'zhang@example.com' };
    expect(mentionHandles(user)).toEqual(['张三', 'zhang']);
    expect(mentionsUser('请 @张三 看一下', user)).toBe(true);
    expect(mentionsUser('请 @zhang 看一下', user)).toBe(true);
    expect(mentionsUser('没有提及', user)).toBe(false);
  });

  it('builds mention, reply and comment titles', () => {
    expect(commentNotificationTitle({
      authorName: '评论者', documentTitle: '样本', kind: 'thread', mentioned: true,
    })).toBe('评论者 在「样本」中提到了你');
    expect(commentNotificationTitle({
      authorName: '评论者', documentTitle: '样本', kind: 'reply', mentioned: false,
    })).toBe('评论者 回复了「样本」中的评论');
    expect(commentNotificationTitle({
      authorName: '评论者', documentTitle: '样本', kind: 'thread', mentioned: false,
    })).toBe('评论者 评论了「样本」');
  });
});

describe('notifyCommentRecipients', () => {
  it('notifies the other reader and never the author', async () => {
    expect(await notifyCommentRecipients(db, {
      documentId,
      authorId,
      body: '这里有个问题',
      kind: 'thread',
    })).toBe(1);

    const ownerRows = await notificationsFor(ownerId);
    expect(ownerRows).toHaveLength(1);
    expect(ownerRows[0]).toMatchObject({
      userId: ownerId,
      kind: 'comment',
      documentId,
      title: '评论者 评论了「评论通知样本」',
    });
    expect(await notificationsFor(authorId)).toHaveLength(0);
  });

  it('stays silent when the recipient switch is off', async () => {
    await db.orm.public.User.where({ id: ownerId }).update({ notifyComments: false });
    expect(await notifyCommentRecipients(db, {
      documentId,
      authorId,
      body: '关掉开关的评论',
      kind: 'thread',
    })).toBe(0);
    expect(await notificationsFor(ownerId)).toHaveLength(0);
  });

  it('marks an @mention in the title', async () => {
    expect(await notifyCommentRecipients(db, {
      documentId,
      authorId,
      body: '@所有者 请看这条',
      kind: 'thread',
    })).toBe(1);
    const [row] = await notificationsFor(ownerId);
    expect(row.title).toBe('评论者 在「评论通知样本」中提到了你');
  });

  it('uses the reply wording for replies', async () => {
    expect(await notifyCommentRecipients(db, {
      documentId,
      authorId,
      body: '补充一句',
      kind: 'reply',
    })).toBe(1);
    const [row] = await notificationsFor(ownerId);
    expect(row.title).toBe('评论者 回复了「评论通知样本」中的评论');
  });
});
