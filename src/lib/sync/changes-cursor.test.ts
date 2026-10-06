import { config } from 'dotenv';

// The claim under test is the sync cursor itself: `.gt(since)` against a column whose contract type
// is the value object `temporal.updatedAtString()`. The two live tests already in this folder only
// quantify over arrays that may be empty (`for (const row of rows) expect(...)`), so a cursor
// predicate that silently matched zero rows would keep them green. Every assertion here can fail.
config();

/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/prisma/db', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const { default: postgres } = await import('@prisma/orm-postgres/runtime');
  let client: any = null;
  return {
    getDb: async () => {
      if (!client) {
        const contractJson = JSON.parse(
          fs.readFileSync(path.join(process.cwd(), 'src/prisma/contract.json'), 'utf-8')
        );
        client = await (postgres as any)({ contractJson, url: process.env['DATABASE_URL'] });
      }
      return client;
    },
  };
});

const { getDb } = await import('@/prisma/db');
const { collectChanges } = await import('@/lib/sync/changes');

const hasDb = Boolean(process.env.DATABASE_URL);
const userId = crypto.randomUUID();
const docIds = [crypto.randomUUID(), crypto.randomUUID()];

let db: any = null;

/** Just my document ids out of one pull, so another account's data can never make these pass. */
async function pullDocs(since: Date | null): Promise<string[]> {
  const res = await collectChanges({ userId, since });
  return (res.changes.Document ?? []).map((row: any) => String(row.id));
}

beforeAll(async () => {
  db = await getDb();
  await db.orm.public.User.create({
    id: userId,
    email: `sync-cursor-${userId.slice(0, 8)}@example.com`,
    name: '同步游标测试账号',
    // Not a credential: this row never logs in, the sync call takes a userId directly.
    password: '!no-login-test-row',
  });
  for (const [i, id] of docIds.entries()) {
    await db.orm.public.Document.create({ id, userId, title: `同步游标文档${i}` });
  }
});

afterAll(async () => {
  if (!db) return;
  // Read the rows back before deleting them: the ids are the fixture's only proof of what it wrote.
  const left = await db.orm.public.Document.where((d: any) => d.id.in(docIds)).select('id').all();
  for (const row of left as any[]) {
    await db.orm.public.Document.where({ id: String(row.id) }).delete();
  }
  await db.orm.public.User.where({ id: userId }).delete();
});

describe.skipIf(!hasDb)('collectChanges cursor (live database)', () => {
  it('pulls my rows at the epoch cursor instead of answering with a silent zero', async () => {
    const docs = await pullDocs(null);
    expect(docs.length, 'Document came back empty at since=null').toBeGreaterThanOrEqual(2);
    for (const id of docIds) expect(docs, `epoch cursor did not return ${id}`).toContain(id);
  }, 30_000);

  it('a cursor in the future excludes them -- after the same test proved they were reachable', async () => {
    // The positive control has to be in this same body: "not found" is also what a dead通路 gives.
    expect(await pullDocs(null), 'positive control went missing, so the zero below proves nothing').toEqual(
      expect.arrayContaining(docIds)
    );

    const later = await pullDocs(new Date(Date.now() + 60_000));
    for (const id of docIds) expect(later, `future cursor still returned ${id}`).not.toContain(id);
  }, 30_000);

  it('a pull at the returned cursor carries the row I just touched', async () => {
    const first = await collectChanges({ userId, since: null });
    const touched = docIds[0];
    await db.orm.public.Document.where({ id: touched }).update({ title: '同步游标文档0-改' });

    const second = await collectChanges({ userId, since: new Date(first.cursor) });
    const docs = (second.changes.Document ?? []).map((row: any) => String(row.id));
    expect(docs, 'the touched row did not come back over the cursor').toContain(touched);
  }, 30_000);
});
