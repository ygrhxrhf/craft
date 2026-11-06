import { config } from 'dotenv';

// The actions write through the real ORM, so vitest needs the same .env Next loads at runtime.
config();

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));
vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const { getSpaceEmailNotification, setSpaceEmailNotification } = await import('./space-notifications');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  await db.orm.public.User.create({
    id: userId,
    email: `g163-${userId.slice(0, 8)}@example.com`,
    name: '通知空间测试账号',
    // Not a credential: this row never logs in, the session is mocked above.
    password: '!no-login-test-row',
  });
});

afterAll(async () => {
  const spaces = await db.orm.public.Space.where({ ownerId: userId }).all();
  for (const space of spaces) await db.orm.public.Space.where({ id: String((space as { id: unknown }).id) }).delete();
  const members = await db.orm.public.SpaceMember.where({ userId }).all();
  for (const member of members) await db.orm.public.SpaceMember.where({ id: String((member as { id: unknown }).id) }).delete();
  await db.orm.public.User.where({ id: userId }).delete();
});

describe('per-space email notifications (G163)', () => {
  it('defaults to following the global switch', async () => {
    session.userId = userId;
    const first = await getSpaceEmailNotification();
    expect(first.emailComments).toBeNull();
    expect(first.globalEmailComments).toBe(true);
    expect(first.spaceName.length).toBeGreaterThan(0);
  });

  it('stores an override for this member and can clear it again', async () => {
    session.userId = userId;
    const on = await setSpaceEmailNotification(true);
    expect(on.emailComments).toBe(true);

    // 落库的是空间 settings JSON，不是 user 行。
    const space = await db.orm.public.Space.first({ id: on.spaceId });
    const settings = (space as { settings?: { notifications?: { emailComments?: Record<string, boolean> } } }).settings;
    expect(settings?.notifications?.emailComments?.[userId]).toBe(true);

    const off = await setSpaceEmailNotification(false);
    expect(off.emailComments).toBe(false);

    const cleared = await setSpaceEmailNotification(null);
    expect(cleared.emailComments).toBeNull();
    const after = await db.orm.public.Space.first({ id: on.spaceId });
    const next = (after as { settings?: { notifications?: { emailComments?: Record<string, boolean> } } }).settings;
    expect(next?.notifications?.emailComments).toBeUndefined();
  });

  it('reports the global value so the panel can show the effective switch', async () => {
    session.userId = userId;
    await db.orm.public.User.where({ id: userId }).update({ notifyComments: false });
    const context = await getSpaceEmailNotification();
    expect(context.globalEmailComments).toBe(false);
    expect(context.emailComments).toBeNull();
  });
});