import { config } from 'dotenv';

// Resolution has to move `updatedAt` or the other devices keep showing the row,
// so this runs against the real database rather than a stand-in.
config();

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const { listNotifications, resolveNotification } = await import('./notification');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';
let otherUserId = '';
let notificationId = '';

async function createNotification(owner: string) {
  const id = crypto.randomUUID();
  await db.orm.public.Notification.create({
    id,
    userId: owner,
    kind: 'taskReminder',
    title: '交周报',
    remindAt: new Date(Date.now() - 60_000).toISOString(),
  });
  return id;
}

async function row(id: string) {
  return db.orm.public.Notification.first({ id }) as Promise<Record<string, unknown>>;
}

// Measured on this stack: `where({ userId }).delete()` removes one row, not every
// match, so isolation between tests goes row by row.
async function clearAll(owner: string) {
  const rows = await db.orm.public.Notification.where({ userId: owner }).all();
  for (const item of rows) await db.orm.public.Notification.where({ id: String(item.id) }).delete();
}

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  otherUserId = crypto.randomUUID();
  for (const id of [userId, otherUserId]) {
    await db.orm.public.User.create({
      id,
      email: `g02-resolve-${id.slice(0, 8)}@example.com`,
      name: '已解决测试账号',
      password: '!no-login-test-row',
    });
  }
  session.userId = userId;
});

beforeEach(async () => {
  if (notificationId) await db.orm.public.Notification.where({ id: notificationId }).delete();
  notificationId = await createNotification(userId);
});

afterAll(async () => {
  await clearAll(userId);
  await clearAll(otherUserId);
  await db.orm.public.User.where({ id: userId }).delete();
  await db.orm.public.User.where({ id: otherUserId }).delete();
});

describe('resolveNotification', () => {
  it('marks the reminder resolved and stamps when', async () => {
    await resolveNotification(notificationId);
    const rowAfter = await row(notificationId);
    expect(rowAfter.isResolved).toBe(true);
    expect(rowAfter.resolvedAt).toBeTruthy();
  });

  it('moves updatedAt so other devices drop the row on their next poll', async () => {
    const before = await row(notificationId);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await resolveNotification(notificationId);
    const after = await row(notificationId);
    expect(String(after.updatedAt)).not.toBe(String(before.updatedAt));
  });

  it('refuses to resolve another user’s notification', async () => {
    const theirs = await createNotification(otherUserId);
    await expect(resolveNotification(theirs)).rejects.toThrow('未授权');
    expect((await row(theirs)).isResolved).toBe(false);
    await db.orm.public.Notification.where({ id: theirs }).delete();
  });

  it('refuses a signed-in-less caller', async () => {
    session.userId = '';
    await expect(resolveNotification(notificationId)).rejects.toThrow('未授权');
    expect((await row(notificationId)).isResolved).toBe(false);
    session.userId = userId;
  });

  it('refuses an id that does not exist instead of creating one', async () => {
    await expect(resolveNotification(crypto.randomUUID())).rejects.toThrow('未授权');
  });
});

describe('listNotifications', () => {
  async function createRow(owner: string, title: string, remindAt: string) {
    const id = crypto.randomUUID();
    await db.orm.public.Notification.create({
      id,
      userId: owner,
      kind: 'taskReminder',
      title,
      remindAt,
    });
    return id;
  }

  beforeEach(async () => {
    await clearAll(userId);
    notificationId = await createRow(userId, '交周报', new Date(Date.now() - 60_000).toISOString());
  });

  it('lists only the rows that are still unresolved', async () => {
    await resolveNotification(notificationId);
    const openId = await createRow(userId, '未解决的那条', new Date().toISOString());
    const listed = await listNotifications();
    expect(listed.map((item) => item.id)).toEqual([openId]);
  });

  it('orders the newest reminder first', async () => {
    await clearAll(userId);
    const older = await createRow(userId, '早', '2026-10-01T09:00:00.000Z');
    const newer = await createRow(userId, '晚', '2026-10-02T09:00:00.000Z');
    const listed = await listNotifications();
    expect(listed.map((item) => item.id)).toEqual([newer, older]);
  });

  it('never returns another user’s row', async () => {
    const theirs = await createRow(otherUserId, '别人的', new Date().toISOString());
    const listed = await listNotifications();
    expect(listed.map((item) => item.id)).not.toContain(theirs);
    expect(listed.map((item) => item.id)).toContain(notificationId);
  });

  it('refuses a signed-in-less caller', async () => {
    session.userId = '';
    await expect(listNotifications()).rejects.toThrow('未授权');
    session.userId = userId;
  });
});
