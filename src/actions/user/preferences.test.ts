import { config } from 'dotenv';

// The action writes through the real ORM, so vitest needs the same .env Next loads
// at runtime.
config();

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

/* Only the session is faked: a switch that never reaches the users row is exactly the bug
 * this file is here to catch, so an in-memory stand-in would prove nothing. */
vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const { getPreferences, updatePreferences } = await import('@/actions/user/preferences');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';

async function row() {
  return (await db.orm.public.User.first({ id: userId })) as Record<string, unknown>;
}

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  await db.orm.public.User.create({
    id: userId,
    email: `g03-notify-${userId.slice(0, 8)}@example.com`,
    name: '通知开关测试账号',
    // Not a credential: this row never logs in, the session is mocked above.
    password: '!no-login-test-row',
  });
  session.userId = userId;
});

beforeEach(async () => {
  await db.orm.public.User.where({ id: userId }).update({
    theme: 'system',
    editorFont: 'inter',
    editorWidth: 'default',
    notifyComments: true,
    notifyReminders: true,
    notifyDaily: true,
  });
});

afterAll(async () => {
  await db.orm.public.User.where({ id: userId }).delete();
});

describe('notification switches', () => {
  it('defaults every switch on for a row inserted without them', async () => {
    // A reset row would prove nothing about the column default, so this uses its own insert.
    const freshId = crypto.randomUUID();
    await db.orm.public.User.create({
      id: freshId,
      email: `g03-default-${freshId.slice(0, 8)}@example.com`,
      name: '默认值测试账号',
      password: '!no-login-test-row',
    });
    session.userId = freshId;
    try {
      expect(await getPreferences()).toMatchObject({
        notifyComments: true,
        notifyReminders: true,
        notifyDaily: true,
      });
    } finally {
      await db.orm.public.User.where({ id: freshId }).delete();
      session.userId = userId;
    }
  });

  it('turning the comments switch off survives a fresh read', async () => {
    await updatePreferences({ notifyComments: false });
    expect(await getPreferences()).toMatchObject({ notifyComments: false });
    expect(await row()).toMatchObject({ notifyComments: false });
  });

  it('keeps each switch independent instead of writing the panel as one blob', async () => {
    await updatePreferences({ notifyReminders: false });
    await updatePreferences({ notifyDaily: false });
    expect(await getPreferences()).toMatchObject({
      notifyComments: true,
      notifyReminders: false,
      notifyDaily: false,
    });
  });

  it('turning a switch back on is stored as on', async () => {
    await updatePreferences({ notifyComments: false });
    expect(await row()).toMatchObject({ notifyComments: false });
    await updatePreferences({ notifyComments: true });
    expect(await row()).toMatchObject({ notifyComments: true });
  });

  it('refuses a switch value that is not a real boolean', async () => {
    // These bypass the declared type on purpose: the validator, not the compiler, is under test.
    const junkValues: unknown[] = ['false', 0, 1, null, undefined];
    for (const junk of junkValues) {
      await expect(updatePreferences({ notifyDaily: junk as boolean })).rejects.toThrow('无效的偏好值');
    }
    expect(await row()).toMatchObject({ notifyDaily: true });
  });
});

describe('the three existing string preferences', () => {
  it('still persist a legal theme', async () => {
    await updatePreferences({ theme: 'dark' });
    expect(await getPreferences()).toMatchObject({ theme: 'dark' });
  });

  it('still refuse a legal-looking but unlisted theme', async () => {
    await expect(updatePreferences({ theme: 'sepia' })).rejects.toThrow('无效的偏好值');
    expect(await row()).toMatchObject({ theme: 'system' });
  });

  it('refuses a signed-in-less caller', async () => {
    session.userId = '';
    await expect(updatePreferences({ notifyComments: false })).rejects.toThrow('未授权');
    session.userId = userId;
  });
});
