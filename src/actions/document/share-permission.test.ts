import { config } from 'dotenv';

// The action writes through the real ORM, so vitest needs the same .env Next loads
// at runtime — without DATABASE_URL these cases have nothing to check against.
config();

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

/* Only the session is faked: the tiers have to land in the actual share row, and the
 * revocation counter is worth nothing if it is asserted against an in-memory stand-in. */
vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const { setSharePermission } = await import('@/actions/document/share');

let db: Awaited<ReturnType<typeof getDb>>;
let ownerId = '';
let documentId = '';

async function currentShare() {
  const rows = await db.orm.public.DocumentShare.where({ documentId }).limit(1).all();
  return rows[0] as Record<string, unknown> | undefined;
}

beforeAll(async () => {
  db = await getDb();
  ownerId = crypto.randomUUID();
  documentId = crypto.randomUUID();
  await db.orm.public.User.create({
    id: ownerId,
    email: `g04-tier-${ownerId.slice(0, 8)}@example.com`,
    name: '档位测试账号',
    // Not a credential: this row never logs in, the session is mocked above. The
    // value can not parse as a bcrypt digest, so no login can ever succeed on it.
    password: '!no-login-test-row',
  });
  await db.orm.public.Document.create({
    id: documentId,
    title: 'G04 分享档位',
    userId: ownerId,
  });
});

beforeEach(async () => {
  session.userId = ownerId;
  await db.orm.public.DocumentShare.where({ documentId }).delete();
  await db.orm.public.DocumentShare.create({
    id: crypto.randomUUID(),
    documentId,
    token: crypto.randomUUID(),
  });
});

afterAll(async () => {
  await db.orm.public.User.where({ id: ownerId }).delete();
});

describe('setSharePermission', () => {
  it('puts the link on the edit tier (old `edit` lands as the canonical `linkEdit`)', async () => {
    await setSharePermission(documentId, 'edit');
    expect(await currentShare()).toMatchObject({ permission: 'linkEdit' });
  });

  it('starts a link on the view tier without touching the column default', async () => {
    // 列默认值仍是 'view'（旧值），读侧归一到 linkView。
    expect(await currentShare()).toMatchObject({ permission: 'view', shareVersion: 0 });
  });

  it('counts every tier change so a connection authorized earlier can be recognized as stale', async () => {
    await setSharePermission(documentId, 'edit');
    expect(await currentShare()).toMatchObject({ shareVersion: 1 });

    await setSharePermission(documentId, 'view');
    expect(await currentShare()).toMatchObject({ permission: 'linkView', shareVersion: 2 });
  });

  it('leaves the counter alone when the owner re-picks the tier that is already live', async () => {
    await setSharePermission(documentId, 'edit');
    await setSharePermission(documentId, 'edit');
    expect(await currentShare()).toMatchObject({ permission: 'linkEdit', shareVersion: 1 });
  });

  it('accepts one of the five canonical tiers directly', async () => {
    await setSharePermission(documentId, 'viewAndComment');
    expect(await currentShare()).toMatchObject({ permission: 'viewAndComment', shareVersion: 1 });
  });

  it('refuses a tier a document link does not have', async () => {
    await expect(setSharePermission(documentId, 'off')).rejects.toThrow('无效的分享权限');
    expect(await currentShare()).toMatchObject({ permission: 'view', shareVersion: 0 });
  });

  it('refuses a caller who does not own the document', async () => {
    session.userId = crypto.randomUUID();
    await expect(setSharePermission(documentId, 'edit')).rejects.toThrow('未授权');
    expect(await currentShare()).toMatchObject({ permission: 'view', shareVersion: 0 });
  });
});
