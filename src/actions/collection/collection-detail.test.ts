import { config } from 'dotenv';

// Real database again: the claim under test is "one batched read instead of one per item",
// and only an executed round trip can show the difference.
config();

/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));
const census = vi.hoisted(() => ({ n: 0, armed: false }));

vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

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
const { getCollection } = await import('@/actions/collection/collection');

let db: any;
const mine = crypto.randomUUID();
const theirs = crypto.randomUUID();

/** collectionId -> expected number of values per item */
const one: { collectionId: string; items: string[] } = { collectionId: '', items: [] };
const many: { collectionId: string; items: string[] } = { collectionId: '', items: [] };
const theirsItems: string[] = [];
const cleanup: { collections: string[]; items: string[]; properties: string[]; values: string[] } = {
  collections: [],
  items: [],
  properties: [],
  values: [],
};

async function seedCollection(userId: string, name: string, itemsWithValues: number[]) {
  const collectionId = crypto.randomUUID();
  cleanup.collections.push(collectionId);
  await db.orm.public.Collection.create({ id: collectionId, userId, name });

  const propertyIds: string[] = [];
  for (let p = 0; p < 2; p += 1) {
    const propertyId = crypto.randomUUID();
    propertyIds.push(propertyId);
    cleanup.properties.push(propertyId);
    await db.orm.public.CollectionProperty.create({
      id: propertyId,
      collectionId,
      name: `${name}-列${p}`,
      type: 'text',
      order: p,
    });
  }

  const items: string[] = [];
  for (let i = 0; i < itemsWithValues.length; i += 1) {
    const itemId = crypto.randomUUID();
    items.push(itemId);
    cleanup.items.push(itemId);
    await db.orm.public.CollectionItem.create({ id: itemId, collectionId, order: i });
    for (let v = 0; v < itemsWithValues[i]; v += 1) {
      const valueId = crypto.randomUUID();
      cleanup.values.push(valueId);
      await db.orm.public.CollectionValue.create({
        id: valueId,
        itemId,
        propertyId: propertyIds[v % propertyIds.length],
        value: JSON.stringify(`${name}#${i}.${v}`),
      });
    }
  }
  return { collectionId, items };
}

/** Statements issued by one getCollection() call, and nothing else. */
async function read(collectionId: string): Promise<{ n: number; rows: any[] }> {
  census.n = 0;
  census.armed = true;
  try {
    const detail = await getCollection(collectionId);
    return { n: census.n, rows: (detail?.items ?? []) as any[] };
  } finally {
    census.armed = false;
  }
}

beforeAll(async () => {
  db = await getDb();
  for (const id of [mine, theirs]) {
    await db.orm.public.User.create({
      id,
      email: `collection-detail-${id.slice(0, 8)}@example.com`,
      name: '集合详情读测试账号',
      // Not a credential: neither row logs in, the session is mocked above.
      password: '!no-login-test-row',
    });
  }
  const seededOne = await seedCollection(mine, '一枚行', [1]);
  const seededMany = await seedCollection(mine, '四枚行', [2, 2, 2, 2]);
  one.collectionId = seededOne.collectionId;
  one.items = seededOne.items;
  many.collectionId = seededMany.collectionId;
  many.items = seededMany.items;

  const theirsSeeded = await seedCollection(theirs, '别人的', [2, 2]);
  theirsItems.push(...theirsSeeded.items);
  session.userId = mine;
});

afterAll(async () => {
  session.userId = '';
  for (const id of cleanup.values) await db.orm.public.CollectionValue.where({ id }).delete();
  for (const id of cleanup.properties) await db.orm.public.CollectionProperty.where({ id }).delete();
  for (const id of cleanup.items) await db.orm.public.CollectionItem.where({ id }).delete();
  for (const id of cleanup.collections) await db.orm.public.Collection.where({ id }).delete();
  for (const id of [mine, theirs]) await db.orm.public.User.where({ id }).delete();
});

describe('the collection detail read', () => {
  it('hands each item only the values that belong to it', async () => {
    const { rows } = await read(many.collectionId);
    const seen = rows.filter((r) => many.items.includes(r.id));
    expect(seen.map((r) => r.id).sort()).toEqual([...many.items].sort());
    for (const row of seen) {
      expect(row.values).toHaveLength(2);
      expect(row.values.map((v: any) => v.itemId)).toEqual([row.id, row.id]);
      expect(new Set(row.values.map((v: any) => v.id)).size).toBe(2);
    }
  });

  it('asks the same number of questions for one item as for four', async () => {
    const small = await read(one.collectionId);
    const big = await read(many.collectionId);
    expect(
      big.n,
      `a one-item collection costs ${small.n} statements, a four-item collection costs ${big.n}`
    ).toBe(small.n);
  });

  it('never returns another account values into the batched read', async () => {
    const { rows } = await read(many.collectionId);
    const valueItemIds = rows.flatMap((r: any) => r.values.map((v: any) => v.itemId));
    expect(valueItemIds).not.toEqual(expect.arrayContaining(theirsItems));
    for (const row of rows) {
      expect(many.items).toContain(row.id);
    }
  });
});
