import { config } from 'dotenv';

// Real database again: the claim under test is a round-trip count, and only an
// executed query can show one that was skipped.
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
const { collectChanges } = await import('@/lib/sync/changes');

let db: any;
const owned: string[] = [];

beforeAll(async () => {
  db = await getDb();
  session.userId = crypto.randomUUID();
  owned.push(session.userId);
  // Deliberately an empty account: no documents, no collections, nothing for the
  // parent-scoped specs to fan out over.
  await db.orm.public.User.create({
    id: session.userId,
    email: `sync-scope-${session.userId.slice(0, 8)}@example.com`,
    password: '!no-login-test-row',
  });
});

afterAll(async () => {
  for (const id of owned) await db.orm.public.User.where({ id }).delete();
  const left = await db.orm.public.User
    .where((u: any) => u.id.in(owned))
    .select('id')
    .all();
  expect(left.length, 'fixture accounts survived teardown').toBe(0);
});

describe('pull budget for an account with nothing to sync', () => {
  it('pays one statement per cursor table and none for the scoped ones', async () => {
    census.armed = false;
    census.n = 0;
    census.armed = true;
    await collectChanges({ userId: session.userId, since: null });
    census.armed = false;

    // 6 directly-owned cursor tables + 2 parent-id probes (Document, Collection)
    // + 2 whole-table reads scoped by userId (Tag, Favorite). The five
    // parent-scoped specs cost nothing here because `incremental()` returns early
    // on an empty parent set (src/lib/sync/changes.ts:193) — the number below is
    // the guard for that line: without it this reads 11.
    if (process.env['SCOPE_VERBOSE']) console.info(`statements for empty account = ${census.n}`);
    expect(census.n, 'round trips for an account with no data').toBe(10);
  }, 30_000);
});
