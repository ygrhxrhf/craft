import { config } from 'dotenv';

// getTasks reads through the real ORM, so vitest needs the same .env Next loads at runtime.
config();

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

/* Only the session is faked — the point of the test is which rows the read hands the screen. */
vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const { getTasks } = await import('@/actions/task/task');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';
let liveDocId = '';
let trashedDocId = '';
let liveTaskId = '';
let trashedTaskId = '';
let inboxTaskId = '';

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  await db.orm.public.User.create({
    id: userId,
    email: `task-trash-${userId.slice(0, 8)}@example.com`,
    name: '任务回收站过滤测试账号',
    // Not a credential: this row never logs in, the session is mocked above.
    password: '!no-login-test-row',
  });

  liveDocId = crypto.randomUUID();
  await db.orm.public.Document.create({ id: liveDocId, userId, title: '在册文档' });
  trashedDocId = crypto.randomUUID();
  await db.orm.public.Document.create({
    id: trashedDocId,
    userId,
    title: '回收站文档',
    isDeleted: true,
  });

  liveTaskId = crypto.randomUUID();
  await db.orm.public.Task.create({ id: liveTaskId, userId, documentId: liveDocId, title: '在册任务' });
  trashedTaskId = crypto.randomUUID();
  await db.orm.public.Task.create({
    id: trashedTaskId,
    userId,
    documentId: trashedDocId,
    title: '回收站里的任务',
  });
  inboxTaskId = crypto.randomUUID();
  await db.orm.public.Task.create({ id: inboxTaskId, userId, title: '收件箱任务' });

  session.userId = userId;
});

afterAll(async () => {
  await db.orm.public.Task.where({ userId }).delete();
  await db.orm.public.Document.where({ id: liveDocId }).delete();
  await db.orm.public.Document.where({ id: trashedDocId }).delete();
  await db.orm.public.User.where({ id: userId }).delete();
});

describe('the task list read', () => {
  it('hides tasks whose document sits in the trash', async () => {
    const ids = (await getTasks()).map((t) => t.id);
    expect(ids).not.toContain(trashedTaskId);
  });

  it('keeps live and inbox tasks', async () => {
    const tasks = await getTasks();
    const live = tasks.find((t) => t.id === liveTaskId);
    expect(live?.documentTitle).toBe('在册文档');
    expect(tasks.find((t) => t.id === inboxTaskId)?.documentId).toBeNull();
  });

  it('leaves the hidden row on the data side', async () => {
    // Official keeps these rows — the split is screen-side only, so the storage must be intact.
    const stored = await db.orm.public.Task.first({ id: trashedTaskId });
    expect((stored as { title: string } | null)?.title).toBe('回收站里的任务');
  });
});
