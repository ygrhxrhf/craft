import { config } from 'dotenv';

// The action is measured against the real database: an in-memory stand-in reports zero
// statements for every implementation, and a statement count is the whole content here.
config();

/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));
const census = vi.hoisted(() => ({ n: 0, armed: false }));

vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

// Same client src/prisma/db.ts builds, plus one middleware that counts executed statements.
// Mocking getDb rather than the ORM keeps the count honest: it counts round trips, not calls.
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
        client = await (postgres as any)({
          contractJson,
          url: process.env['DATABASE_URL'],
          middleware: [
            {
              name: 'statement-census',
              familyId: 'sql',
              async afterQuery() {
                if (census.armed) census.n += 1;
              },
            },
          ],
        });
      }
      return client;
    },
  };
});

const { getDb } = await import('@/prisma/db');
const { getCollections } = await import('@/actions/collection/collection');

let db: any;
const mine = crypto.randomUUID();
const theirs = crypto.randomUUID();
const collectionIds: string[] = [];
const orphanIds: string[] = [];

async function newCollection(userId: string, name: string, properties: number, items: number) {
  const collectionId = crypto.randomUUID();
  await db.orm.public.Collection.create({ id: collectionId, userId, name });
  for (let i = 0; i < properties; i++) {
    await db.orm.public.CollectionProperty.create({
      id: crypto.randomUUID(),
      collectionId,
      name: `${name}-属性${i}`,
      type: 'text',
      order: i,
    });
  }
  for (let i = 0; i < items; i++) {
    await db.orm.public.CollectionItem.create({
      id: crypto.randomUUID(),
      collectionId,
      order: i,
    });
  }
  return collectionId;
}

/** Statements issued by one getCollections() call, and nothing else. */
async function read(): Promise<{ n: number; rows: any[] }> {
  census.n = 0;
  census.armed = true;
  try {
    const rows = await getCollections();
    return { n: census.n, rows: rows as any[] };
  } finally {
    census.armed = false;
  }
}

beforeAll(async () => {
  db = await getDb();
  for (const id of [mine, theirs]) {
    await db.orm.public.User.create({
      id,
      email: `collection-batch-${id.slice(0, 8)}@example.com`,
      name: '集合批量读测试账号',
      // Not a credential: neither row logs in, the session is mocked above.
      password: '!no-login-test-row',
    });
  }
  // Four of mine, two of theirs: enough that "one query per collection" and "one query per
  // page" differ by a factor a reader can see without trusting the expected number.
  for (const name of ['甲', '乙', '丙', '丁']) collectionIds.push(await newCollection(mine, name, 2, 3));
  for (const name of ['外丙', '外丁']) orphanIds.push(await newCollection(theirs, name, 2, 3));
  session.userId = mine;
});

afterAll(async () => {
  session.userId = '';
  for (const id of [...collectionIds, ...orphanIds]) {
    await db.orm.public.Collection.where({ id }).delete();
  }
  for (const id of [mine, theirs]) {
    await db.orm.public.User.where({ id }).delete();
  }
});

describe('the collection list read', () => {
  it('hands each collection its own properties and its own item count', async () => {
    const { rows } = await read();
    const seen = rows.filter((r) => collectionIds.includes(r.id));
    expect(seen.map((r) => r.id).sort()).toEqual([...collectionIds].sort());
    for (const row of seen) {
      expect(row._count.items).toBe(3);
      expect(row.properties).toHaveLength(2);
      // Grouping by parent is the part a batched read gets wrong silently: every property
      // shipped under a collection must actually belong to it.
      expect(row.properties.map((p: any) => p.collectionId)).toEqual([row.id, row.id]);
      expect(new Set(row.properties.map((p: any) => p.id)).size).toBe(2);
    }
  });

  it('never returns another account rows into the batched read', async () => {
    const { rows } = await read();
    expect(rows.map((r) => r.id)).not.toEqual(expect.arrayContaining(orphanIds));
    for (const row of rows) {
      expect(row.userId).toBe(mine);
    }
  });

  it('asks the same number of questions for two collections as for four', async () => {
    const withFour = await read();
    // Two of my collections go away; the other account keeps its two, so a read that simply
    // "queries everything once" cannot pass by counting a fixed table size either.
    for (const id of collectionIds.slice(2)) {
      await db.orm.public.Collection.where({ id }).delete();
    }
    collectionIds.splice(2);
    const withTwo = await read();

    expect(withTwo.n, `four collections cost ${withFour.n} statements, two cost ${withTwo.n}`).toBe(
      withFour.n
    );
  });
});
