import { config } from 'dotenv';

// Real database: the claim under test is about which rows Postgres hands back for a
// limit-then-filter read, and no stand-in reproduces that ordering.
config();

/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

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
        });
      }
      return client;
    },
  };
});

const { getDb } = await import('@/prisma/db');
const { searchAll } = await import('@/actions/document/search');

let db: any;
const mine = crypto.randomUUID();
const theirs = crypto.randomUUID();
const collectionIds: string[] = [];
const propertyIds: string[] = [];
const itemIds: string[] = [];
const valueIds: string[] = [];

const NEEDLE = 'needleK7';
/** The one row that has to survive the page limit. */
const mineItem: { id: string } = { id: '' };

async function seedCollection(userId: string, name: string, matches: number) {
  const collectionId = crypto.randomUUID();
  collectionIds.push(collectionId);
  await db.orm.public.Collection.create({ id: collectionId, userId, name });

  const propertyId = crypto.randomUUID();
  propertyIds.push(propertyId);
  await db.orm.public.CollectionProperty.create({
    id: propertyId,
    collectionId,
    name: `${name}-列`,
    type: 'text',
    order: 0,
  });

  let lastItemId = '';
  for (let i = 0; i < matches; i += 1) {
    const itemId = crypto.randomUUID();
    itemIds.push(itemId);
    lastItemId = itemId;
    await db.orm.public.CollectionItem.create({ id: itemId, collectionId, order: i });
    const valueId = crypto.randomUUID();
    valueIds.push(valueId);
    // The json codec serialises on write and parses twice on read, so a writer has to hand it
    // JSON text -- see docs/test-report.md item 19.
    await db.orm.public.CollectionValue.create({
      id: valueId,
      itemId,
      propertyId,
      value: JSON.stringify(`${NEEDLE}-${name}-${i}`),
    });
  }
  return lastItemId;
}

beforeAll(async () => {
  db = await getDb();
  for (const id of [mine, theirs]) {
    await db.orm.public.User.create({
      id,
      email: `search-scope-${id.slice(0, 8)}@example.com`,
      name: '集合搜索作用域测试账号',
      // Not a credential: neither row logs in, the session is mocked above.
      password: '!no-login-test-row',
    });
  }
  // Theirs first, mine last: a read that takes the page before it filters by owner sees the
  // heap order and drops the row that should be in the result.
  await seedCollection(theirs, '外方', 10);
  mineItem.id = await seedCollection(mine, '我的', 1);
  session.userId = mine;
});

afterAll(async () => {
  session.userId = '';
  for (const id of valueIds) await db.orm.public.CollectionValue.where({ id }).delete();
  for (const id of itemIds) await db.orm.public.CollectionItem.where({ id }).delete();
  for (const id of propertyIds) await db.orm.public.CollectionProperty.where({ id }).delete();
  for (const id of collectionIds) await db.orm.public.Collection.where({ id }).delete();
  for (const id of [mine, theirs]) await db.orm.public.User.where({ id }).delete();
});

describe('collection rows inside a global search', () => {
  it('keeps my row when another account holds more matches than one page', async () => {
    const result = await searchAll(NEEDLE);
    const returned = (result.rows as any[]).map((r) => r.itemId);
    expect(returned, `search returned [${returned.join(', ')}], my row ${mineItem.id} is absent`).toContain(
      mineItem.id
    );
  });

  it('never puts another account row in my results', async () => {
    const result = await searchAll(NEEDLE);
    const mineIdx = itemIds.indexOf(mineItem.id);
    const myItems = itemIds.slice(mineIdx);
    for (const row of result.rows as any[]) {
      expect(myItems).toContain(row.itemId);
    }
  });

  it('shows the cell text, not the json wrapper', async () => {
    const result = await searchAll(NEEDLE);
    // Independent of whose rows came back: the stored cell is a json string scalar, so a
    // reader that decoded one time too few would show the quotes to the user.
    expect((result.rows as any[]).length).toBeGreaterThan(0);
    for (const row of result.rows as any[]) {
      expect(row.text).not.toContain('"');
      expect(row.text).toContain(NEEDLE);
    }
  });
});
