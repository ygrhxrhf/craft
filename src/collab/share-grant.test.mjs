// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'dotenv/config';

import { loadShareGrant } from './persist.mjs';

const hasDb = Boolean(process.env.DATABASE_URL);

async function client() {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const mod = await import('@prisma/orm-postgres/runtime');
  const contractJson = JSON.parse(
    fs.readFileSync(path.resolve('src/prisma/contract.json'), 'utf8'),
  );
  return mod.default({ contractJson, url: process.env.DATABASE_URL });
}

describe.skipIf(!hasDb)('live share grant read by the collab server', () => {
  let db;
  let documentId = '';
  let userId = '';

  beforeAll(async () => {
    db = await client();
    userId = crypto.randomUUID();
    documentId = crypto.randomUUID();
    await db.orm.public.User.create({
      id: userId,
      email: `g04-live-${userId.slice(0, 8)}@example.com`,
      name: '实时复核测试账号',
      password: '!no-login-test-row',
    });
    await db.orm.public.Document.create({ id: documentId, title: 'G04 实时复核', userId });
    await db.orm.public.DocumentShare.create({
      id: crypto.randomUUID(),
      documentId,
      token: crypto.randomUUID(),
      permission: 'edit',
      isPublished: true,
      shareVersion: 2,
      passcode: '口令不该离开应用侧',
    });
  });

  afterAll(async () => {
    await db.orm.public.User.where({ id: userId }).delete();
  });

  it('reads the tier, the publication and the version the connection was signed against', async () => {
    expect(await loadShareGrant(documentId)).toMatchObject({
      isPublished: true,
      permission: 'edit',
      shareVersion: 2,
    });
  });

  it('carries neither the passcode nor the link token to the sync process', async () => {
    const grant = await loadShareGrant(documentId);
    expect(Object.keys(grant).sort()).toEqual(['isPublished', 'permission', 'shareVersion']);
  });

  it('sees the owner’s newest change rather than a value cached at startup', async () => {
    await db.orm.public.DocumentShare
      .where({ documentId })
      .update({ permission: 'view', shareVersion: 3 });
    expect(await loadShareGrant(documentId)).toMatchObject({ permission: 'view', shareVersion: 3 });

    await db.orm.public.DocumentShare
      .where({ documentId })
      .update({ permission: 'edit', shareVersion: 4 });
    expect(await loadShareGrant(documentId)).toMatchObject({ permission: 'edit', shareVersion: 4 });
  });

  it('finds no grant for a document that was never shared', async () => {
    expect(await loadShareGrant(crypto.randomUUID())).toBeNull();
  });
});
