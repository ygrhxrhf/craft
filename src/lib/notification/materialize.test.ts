import { config } from 'dotenv';

// The generator writes through the real ORM and reads back what Postgres stored,
// so an in-memory stand-in could not catch the one thing this file is here for.
config();

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const { getDb } = await import('@/prisma/db');
const { materializeTaskReminders } = await import('./materialize');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';
let otherUserId = '';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const minutesAhead = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

async function createTask(overrides: Record<string, unknown> = {}) {
  const id = crypto.randomUUID();
  await db.orm.public.Task.create({
    id,
    userId,
    title: '交周报',
    isCompleted: false,
    status: 'todo',
    remindAt: minutesAgo(1),
    ...overrides,
  });
  return id;
}

async function rows() {
  return db.orm.public.Notification.where({ userId }).all();
}

async function syncEvents() {
  return db.orm.public.SyncEvent.where({ userId }).all() as Promise<Record<string, unknown>[]>;
}

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  otherUserId = crypto.randomUUID();
  for (const id of [userId, otherUserId]) {
    await db.orm.public.User.create({
      id,
      email: `g02-notify-${id.slice(0, 8)}@example.com`,
      name: '提醒投递测试账号',
      // Not a credential: these rows never log in, the generator takes a user id.
      password: '!no-login-test-row',
    });
  }
});

beforeEach(async () => {
  await db.orm.public.User.where({ id: userId }).update({ notifyReminders: true });
});

// Measured on this stack: `where({ userId }).delete()` removes a single row, not
// every match, so teardown goes row by row or leftovers leak into the next test.
async function clearAll(model: 'Task' | 'Document' | 'Notification' | 'BlockReminder') {
  const rows = await db.orm.public[model].where({ userId }).all();
  for (const item of rows) await db.orm.public[model].where({ id: String(item.id) }).delete();
}

afterEach(async () => {
  const events = await syncEvents();
  for (const event of events) await db.orm.public.SyncEvent.where({ id: event.id }).delete();
  await clearAll('Notification');
  await clearAll('BlockReminder');
  await clearAll('Task');
  await clearAll('Document');
});

afterAll(async () => {
  await db.orm.public.User.where({ id: userId }).delete();
  await db.orm.public.User.where({ id: otherUserId }).delete();
});

describe('materializeTaskReminders', () => {
  it('creates one notification for a reminder that came due', async () => {
    const taskId = await createTask();
    expect(await materializeTaskReminders(userId)).toBe(1);

    const [row] = await rows() as Record<string, unknown>[];
    expect(row).toMatchObject({
      userId,
      kind: 'taskReminder',
      taskId,
      title: '交周报',
      isResolved: false,
    });
    const events = await syncEvents();
    expect(events).toHaveLength(1);
    expect(events[0].tables).toEqual(['notification']);
  });

  it('creates nothing for a reminder still in the future', async () => {
    await createTask({ remindAt: minutesAhead(30) });
    expect(await materializeTaskReminders(userId)).toBe(0);
    expect(await rows()).toHaveLength(0);
  });

  it('does not create a second row on the next poll', async () => {
    await createTask();
    await materializeTaskReminders(userId);
    expect(await materializeTaskReminders(userId)).toBe(0);
    expect(await rows()).toHaveLength(1);
  });

  it('stays silent while the reminders switch is off', async () => {
    await createTask();
    await db.orm.public.User.where({ id: userId }).update({ notifyReminders: false });
    expect(await materializeTaskReminders(userId)).toBe(0);
    expect(await rows()).toHaveLength(0);
  });

  it('does not resurrect a reminder the user already resolved', async () => {
    const taskId = await createTask();
    await materializeTaskReminders(userId);
    await db.orm.public.Notification.where({ taskId }).update({ isResolved: true });

    expect(await materializeTaskReminders(userId)).toBe(0);
    const [row] = await rows() as Record<string, unknown>[];
    expect(row.isResolved).toBe(true);
  });

  it('skips a task whose document sits in the trash', async () => {
    const documentId = crypto.randomUUID();
    await db.orm.public.Document.create({
      id: documentId,
      title: '已删除的文档',
      userId,
      isDeleted: true,
    });
    await createTask({ documentId });

    expect(await materializeTaskReminders(userId)).toBe(0);
    expect(await rows()).toHaveLength(0);
  });

  it('ignores another user’s task with the same reminder moment', async () => {
    const taskId = await createTask();
    await db.orm.public.Task.create({
      id: crypto.randomUUID(),
      userId: otherUserId,
      title: '别人的任务',
      isCompleted: false,
      status: 'todo',
      remindAt: minutesAgo(1),
    });

    expect(await materializeTaskReminders(userId)).toBe(1);
    const [row] = await rows() as Record<string, unknown>[];
    expect(row.taskId).toBe(taskId);
    expect(await db.orm.public.Notification.where({ userId: otherUserId }).all()).toHaveLength(0);
  });

  it('skips a task that is already checked off', async () => {
    await createTask({ isCompleted: true });
    expect(await materializeTaskReminders(userId)).toBe(0);
    expect(await rows()).toHaveLength(0);
  });

  it('取消那一档同样不投递：行上的勾是空的，列谓词兜不住（G52）', async () => {
    // `isCompleted.eq(false)` 这一条 SQL 谓词只拦得住"完成"，取消行恰好是 isCompleted=false，
    // 必须靠 JS 侧那一刀。这一枚就是那一刀的存活性证明。
    await createTask({ status: 'cancelled', cancelledAt: minutesAgo(30) });
    expect(await materializeTaskReminders(userId)).toBe(0);
    expect(await rows()).toHaveLength(0);
  });

  // G252 —— 提醒可挂在任意区块上：非任务块的提醒走同一窗口，落成的通知带 blockId。
  it('G252 非任务块的提醒也投递，且带上 blockId', async () => {
    const documentId = crypto.randomUUID();
    await db.orm.public.Document.create({ id: documentId, title: '一篇文档', userId });
    const blockId = crypto.randomUUID();
    await db.orm.public.BlockReminder.create({
      id: crypto.randomUUID(),
      userId,
      documentId,
      blockId,
      title: '此区块',
      remindAt: minutesAgo(1),
    });

    expect(await materializeTaskReminders(userId)).toBe(1);
    const [row] = (await rows()) as Record<string, unknown>[];
    expect(row).toMatchObject({
      userId,
      kind: 'blockReminder',
      blockId,
      documentId,
      taskId: null,
    });
  });

  it('G252 同一枚块下一次轮询不再重复投递', async () => {
    const documentId = crypto.randomUUID();
    await db.orm.public.Document.create({ id: documentId, title: '一篇文档', userId });
    await db.orm.public.BlockReminder.create({
      id: crypto.randomUUID(),
      userId,
      documentId,
      blockId: crypto.randomUUID(),
      title: '此区块',
      remindAt: minutesAgo(1),
    });
    await materializeTaskReminders(userId);
    expect(await materializeTaskReminders(userId)).toBe(0);
    expect(await rows()).toHaveLength(1);
  });

  it('G252 已 resolve 的块提醒不投递', async () => {
    const documentId = crypto.randomUUID();
    await db.orm.public.Document.create({ id: documentId, title: '一篇文档', userId });
    await db.orm.public.BlockReminder.create({
      id: crypto.randomUUID(),
      userId,
      documentId,
      blockId: crypto.randomUUID(),
      title: '此区块',
      remindAt: minutesAgo(1),
      isCompleted: true,
    });
    expect(await materializeTaskReminders(userId)).toBe(0);
  });
});
