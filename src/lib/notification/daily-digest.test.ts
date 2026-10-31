import { config } from 'dotenv';

// The generator writes through the real ORM and reads back the stored row.
config();

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const { getDb } = await import('@/prisma/db');
const {
  materializeDailyDigest,
  startOfLocalDay,
  endOfLocalDay,
  dailyDigestTitle,
} = await import('./daily-digest');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';
let otherUserId = '';

async function createTask(overrides: Record<string, unknown> = {}) {
  const id = crypto.randomUUID();
  await db.orm.public.Task.create({
    id,
    userId,
    title: '今日任务',
    isCompleted: false,
    status: 'todo',
    dueDate: new Date().toISOString(),
    ...overrides,
  });
  return id;
}

async function notifications() {
  return db.orm.public.Notification.where({ userId }).all() as Promise<Record<string, unknown>[]>;
}

async function clearRows(model: 'Task' | 'Notification' | 'SyncEvent') {
  const rows = await db.orm.public[model].where({ userId }).all();
  for (const row of rows) await db.orm.public[model].where({ id: String(row.id) }).delete();
}

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  otherUserId = crypto.randomUUID();
  for (const id of [userId, otherUserId]) {
    await db.orm.public.User.create({
      id,
      email: `g03-digest-${id.slice(0, 8)}@example.com`,
      name: '每日摘要测试账号',
      password: '!no-login-test-row',
    });
  }
});

beforeEach(async () => {
  await db.orm.public.User.where({ id: userId }).update({ notifyDaily: true });
  await clearRows('Notification');
  await clearRows('Task');
  await clearRows('SyncEvent');
});

afterAll(async () => {
  await clearRows('Notification');
  await clearRows('Task');
  await clearRows('SyncEvent');
  for (const id of [userId, otherUserId]) {
    await db.orm.public.User.where({ id }).delete();
  }
});

describe('daily digest helpers', () => {
  it('uses a local-day window and a literal title', () => {
    const now = new Date('2026-10-30T12:00:00+08:00');
    const start = startOfLocalDay(now);
    const end = endOfLocalDay(now);
    expect(start.getHours()).toBe(0);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(dailyDigestTitle(2, 1)).toBe('今天的摘要：2 个任务、1 个提醒');
  });
});

describe('materializeDailyDigest', () => {
  it('creates one digest for a task due today', async () => {
    await createTask();
    expect(await materializeDailyDigest(userId)).toBe(1);

    const [row] = await notifications();
    expect(row).toMatchObject({
      userId,
      kind: 'dailyDigest',
      title: '今天的摘要：1 个任务、0 个提醒',
      isResolved: false,
    });
  });

  it('does not create a second digest on the next poll', async () => {
    await createTask();
    await materializeDailyDigest(userId);
    expect(await materializeDailyDigest(userId)).toBe(0);
    expect(await notifications()).toHaveLength(1);
  });

  it('stays silent while the daily switch is off', async () => {
    await createTask();
    await db.orm.public.User.where({ id: userId }).update({ notifyDaily: false });
    expect(await materializeDailyDigest(userId)).toBe(0);
    expect(await notifications()).toHaveLength(0);
  });

  it('creates nothing when nothing is due today', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await createTask({ dueDate: tomorrow.toISOString() });
    expect(await materializeDailyDigest(userId)).toBe(0);
    expect(await notifications()).toHaveLength(0);
  });

  it('counts reminders separately from due tasks', async () => {
    await createTask({ dueDate: null, remindAt: new Date().toISOString() });
    expect(await materializeDailyDigest(userId)).toBe(1);
    const [row] = await notifications();
    expect(row.title).toBe('今天的摘要：0 个任务、1 个提醒');
  });

  it('ignores completed and cancelled tasks', async () => {
    await createTask({ isCompleted: true, status: 'done' });
    await createTask({ status: 'cancelled' });
    expect(await materializeDailyDigest(userId)).toBe(0);
    expect(await notifications()).toHaveLength(0);
  });
});
