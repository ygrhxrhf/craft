/* eslint-disable @typescript-eslint/no-explicit-any */
// Same reason as src/lib/sync/changes.ts: the proxy surface this file exercises
// is reached through string keys, which the generated types do not narrow.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

// The live-database cases below need DATABASE_URL. Next.js loads .env for us at
// runtime, but vitest does not — without this the driver never connects.
config();

import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_COLUMNS,
  INCREMENTAL_TABLES,
  SCOPED_INCREMENTAL_TABLES,
  FULL_TABLES,
  collectChanges,
  toEpochMs,
} from './changes';
import { getDb } from '@/prisma/db';

const ALL_SPECS = {
  ...INCREMENTAL_TABLES,
  ...SCOPED_INCREMENTAL_TABLES,
  ...FULL_TABLES,
};

describe('toEpochMs', () => {
  it('parses the raw timestamptz string postgres hands back', () => {
    // The pg driver returns this verbatim; it is NOT a Date.
    expect(toEpochMs('2026-09-29 18:06:49.485+08')).toBe(Date.parse('2026-09-29 18:06:49.485+08'));
  });

  it('accepts Date and epoch-milliseconds', () => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    expect(toEpochMs(d)).toBe(d.getTime());
    expect(toEpochMs(1700000000000)).toBe(1700000000000);
  });

  it('returns NaN for junk instead of silently yielding 0', () => {
    expect(Number.isNaN(toEpochMs('not-a-date'))).toBe(true);
    expect(Number.isNaN(toEpochMs(null))).toBe(true);
    expect(Number.isNaN(toEpochMs(undefined))).toBe(true);
  });
});

describe('column whitelists', () => {
  it('never ships body payloads or secrets', () => {
    for (const [table, spec] of Object.entries(ALL_SPECS)) {
      for (const forbidden of FORBIDDEN_COLUMNS) {
        expect(
          spec.columns,
          `${table} must not expose ${forbidden}`,
        ).not.toContain(forbidden);
      }
    }
  });

  it('keeps Document.content and .plainText out — Yjs owns the body', () => {
    expect(INCREMENTAL_TABLES.Document.columns).not.toContain('content');
    expect(INCREMENTAL_TABLES.Document.columns).not.toContain('plainText');
  });

  it('keeps Whiteboard.data out — tldraw-sync owns the scene', () => {
    expect(INCREMENTAL_TABLES.Whiteboard.columns).not.toContain('data');
  });

  it('every incremental table selects updatedAt (it is the cursor)', () => {
    for (const [table, spec] of Object.entries({
      ...INCREMENTAL_TABLES,
      ...SCOPED_INCREMENTAL_TABLES,
    })) {
      expect(spec.columns, table).toContain('updatedAt');
    }
  });

  it('every parent-scoped table selects its parent key', () => {
    for (const [table, spec] of Object.entries(SCOPED_INCREMENTAL_TABLES)) {
      expect(spec.columns, table).toContain(spec.parentKey);
    }
  });
});

/**
 * Everything above is self-referential — it checks a spec against itself. These
 * check it against `contract.json`, the artifact the client is built from.
 *
 * `collectChanges` reaches each table through `db.orm.public[table]` and each
 * field through `d[column]`, both keyed by *strings* out of these objects, so
 * tsc never sees the dependency: rename or drop a column in the contract and
 * nothing in a typecheck warns — the sync endpoint either throws on every poll
 * or silently ships a row that is missing a field the client then reads as
 * undefined. A full-suite green would sit on top of that.
 */
describe('specs against the emitted contract', () => {
  type ContractModel = { fields: Record<string, unknown> };

  const contract = JSON.parse(
    readFileSync(path.join(process.cwd(), 'src/prisma/contract.json'), 'utf-8'),
  ) as { domain: { namespaces: { public: { models: Record<string, ContractModel> } } } };
  const models = contract.domain.namespaces.public.models;

  // A contract shape change would empty this map, and then every `in` test
  // below passes vacuously. The denominator is what makes the zeros mean zero.
  it('reads enough of the contract to be a control', () => {
    expect(Object.keys(models).length).toBeGreaterThanOrEqual(20);
    if (process.env['SPEC_VERBOSE']) {
      const columns = Object.values(ALL_SPECS).reduce((n, spec) => n + spec.columns.length, 0);
      const cursorable = Object.keys(models).filter(
        (m) => 'updatedAt' in models[m].fields && !(m in ALL_SPECS),
      );
      console.info(
        `specs: models=${Object.keys(models).length} tables=${Object.keys(ALL_SPECS).length}` +
          ` columns=${columns} cursorableButUnsynced=${cursorable.length} [${cursorable.join(', ')}]`,
      );
    }
  });

  it('names only models that exist in the contract', () => {
    for (const table of Object.keys(ALL_SPECS)) {
      expect(models, `no contract model named ${table}`).toHaveProperty(table);
    }
  });

  it('selects only columns that exist on the model', () => {
    for (const [table, spec] of Object.entries(ALL_SPECS)) {
      const fields = models[table]?.fields ?? {};
      for (const column of spec.columns) {
        expect(fields, `${table}.${column} is not a contract field`).toHaveProperty(column);
      }
    }
  });

  it('cursors only over columns the model actually has', () => {
    // `.where((d) => d.updatedAt.gt(since))` is built at runtime for both maps.
    for (const [table, spec] of Object.entries({
      ...INCREMENTAL_TABLES,
      ...SCOPED_INCREMENTAL_TABLES,
    })) {
      const fields = models[table]?.fields ?? {};
      expect(fields, `${table} has no updatedAt to cursor over`).toHaveProperty('updatedAt');
      expect(spec.columns, table).toContain('updatedAt');
    }
  });

  it('scopes each table by a column the model has', () => {
    for (const table of Object.keys(INCREMENTAL_TABLES)) {
      const fields = models[table]?.fields ?? {};
      // `.where({ userId })` here. A wrong *key* in the shorthand throws, but a
      // wrong *value shape* does not — see src/prisma/where-shorthand.test.ts.
      expect(fields, `${table} is scoped by userId but has no such column`).toHaveProperty(
        'userId',
      );
    }
    for (const [table, spec] of Object.entries(SCOPED_INCREMENTAL_TABLES)) {
      const fields = models[table]?.fields ?? {};
      expect(
        fields,
        `${table} is scoped by ${spec.parentKey} but has no such column`,
      ).toHaveProperty(spec.parentKey);
    }
    for (const [table, spec] of Object.entries(FULL_TABLES)) {
      if (!('ownedByUser' in spec)) continue;
      const fields = models[table]?.fields ?? {};
      expect(fields, `${table} ships whole on userId but has no such column`).toHaveProperty(
        'userId',
      );
    }
  });

  it('ships whole only what genuinely cannot be cursorred', () => {
    // The comment on FULL_TABLES claims there is nothing to cursor over. If a
    // model gains updatedAt, the claim goes stale and the table should move.
    for (const table of Object.keys(FULL_TABLES)) {
      const fields = models[table]?.fields ?? {};
      expect(
        Object.keys(fields),
        `${table} now has updatedAt and is still shipped whole every poll`,
      ).not.toContain('updatedAt');
    }
  });
});

describe('collectChanges (live database)', () => {
  // These hit the real database: ~15 queries plus the first-connection cost.
  // Under a full-suite run that can exceed vitest's 5s default and fail for
  // reasons that have nothing to do with the code, so the budget is explicit.
  it('never leaks body payloads and stays inside one tenant', async () => {
    const db = await getDb();
    const users = await db.orm.public.User.select('id').limit(1).all();
    if (users.length === 0) return; // empty dev database — nothing to assert

    const userId = String(users[0].id);
    const first = await collectChanges({ userId, since: null });

    // No forbidden column may appear anywhere in the payload.
    for (const rows of [...Object.values(first.changes), ...Object.values(first.full)]) {
      for (const row of rows) {
        for (const key of Object.keys(row)) {
          expect(FORBIDDEN_COLUMNS, `leaked column: ${key}`).not.toContain(key);
        }
      }
    }

    // Tenant isolation on every table that carries userId directly.
    for (const table of ['Document', 'Folder', 'Whiteboard', 'Task', 'Collection']) {
      for (const row of first.changes[table] ?? []) {
        expect(row.userId, `${table} row belongs to another user`).toBe(userId);
      }
    }
    for (const row of first.full.Tag ?? []) expect(row.userId).toBe(userId);
    for (const row of first.full.Favorite ?? []) expect(row.userId).toBe(userId);

    // Parent-scoped rows must belong to something the caller owns.
    const docIds = new Set((first.changes.Document ?? []).map((r) => String(r.id)));
    for (const row of first.full.Backlink ?? []) {
      expect(docIds.has(String(row.sourceDocumentId))).toBe(true);
    }
    for (const row of first.full.DocumentTag ?? []) {
      expect(docIds.has(String(row.documentId))).toBe(true);
    }

    expect(Number.isNaN(Date.parse(first.cursor))).toBe(false);
  }, 20_000);

  it('a second pull at the cursor is a no-op replay, not new data', async () => {
    const db = await getDb();
    const users = await db.orm.public.User.select('id').limit(1).all();
    if (users.length === 0) return;

    const userId = String(users[0].id);
    const first = await collectChanges({ userId, since: null });
    const second = await collectChanges({ userId, since: new Date(first.cursor) });

    // The cursor is millisecond-truncated while postgres stores microseconds, so
    // rows sharing that final millisecond are replayed. That is fine — clients
    // apply by id — but it must never surface rows we did not already send.
    for (const table of Object.keys(second.changes)) {
      const seen = new Set((first.changes[table] ?? []).map((r) => String(r.id)));
      for (const row of second.changes[table]) {
        expect(seen.has(String(row.id)), `${table} replayed an unseen row`).toBe(true);
      }
    }

    expect(second.hasMore).toBe(false);
  }, 20_000);
});

/**
 * The contract cases above prove names exist. They cannot prove the *proxy*
 * offers the method this module calls on it: `d.userId.eq(...)`,
 * `d[scope.key].in(...)`, `d.updatedAt.gt(...)` and `d.updatedAt.asc()` are all
 * built at runtime behind `db.orm.public[table]`, so tsc sees none of them and a
 * wrong pair surfaces as a rejection on the 2s poll.
 *
 * `asc`/`desc` are a second capability surface again: the predicate table
 * (`eq,in,notIn,lt,lte,gt,gte,like,ilike`) says nothing about ordering, and the
 * two failure shapes are distinguishable — a missing field reads
 * `Cannot read properties of undefined`, a field that exists but cannot be
 * ordered reads `is not a function` (measured: `CollectionValue.value`).
 *
 * The list is derived from the exported specs, so it cannot drift away from them.
 */
describe('proxy capability for the shapes collectChanges builds (live database)', () => {
  type Shape = {
    table: string;
    field: string;
    method: string;
    clause: 'where' | 'orderBy';
  };

  const EPOCH = new Date(0);
  const shapes: Shape[] = [];
  for (const table of Object.keys(INCREMENTAL_TABLES)) {
    shapes.push({ table, field: 'userId', method: 'eq', clause: 'where' });
    shapes.push({ table, field: 'updatedAt', method: 'gt', clause: 'where' });
    shapes.push({ table, field: 'updatedAt', method: 'asc', clause: 'orderBy' });
  }
  for (const [table, spec] of Object.entries(SCOPED_INCREMENTAL_TABLES)) {
    shapes.push({ table, field: spec.parentKey, method: 'in', clause: 'where' });
    shapes.push({ table, field: 'updatedAt', method: 'gt', clause: 'where' });
    shapes.push({ table, field: 'updatedAt', method: 'asc', clause: 'orderBy' });
  }
  // Mirrors the hardcoded ternary in collectChanges (Backlink keys off the
  // source, the rest off documentId).
  for (const [table, spec] of Object.entries(FULL_TABLES)) {
    if (!('viaDocuments' in spec)) continue;
    shapes.push({
      table,
      field: table === 'Backlink' ? 'sourceDocumentId' : 'documentId',
      method: 'in',
      clause: 'where',
    });
  }

  const build = (db: any, s: Shape) => {
    const table = db.orm.public[s.table];
    const value = s.method === 'in' ? ['00000000-0000-0000-0000-000000000000']
      : s.method === 'gt' ? EPOCH
      : '00000000-0000-0000-0000-000000000000';
    const chain = s.clause === 'orderBy' ? table.orderBy((m: any) => m[s.field][s.method]())
      : table.where((m: any) => m[s.field][s.method](value));
    // Select the field under test, not `id`: DocumentTag has no id column, and a
    // projection error would read as a capability failure.
    return chain.select(s.field).limit(1).all();
  };

  it('builds every shape the specs generate', async () => {
    // Denominator: derived-from-specs means an empty spec map would pass while
    // proving nothing.
    expect(shapes.length).toBeGreaterThanOrEqual(30);
    const db = await getDb();
    const failures: string[] = [];
    for (const s of shapes) {
      try {
        await build(db, s);
      } catch (e) {
        failures.push(`${s.clause} ${s.table}.${s.field}.${s.method}() :: ${String((e as Error)?.message ?? e).split('\n')[0].slice(0, 90)}`);
      }
    }
    if (process.env['CAP_VERBOSE']) {
      console.info(`capability shapes=${shapes.length} failures=${failures.length}`);
    }
    expect(failures, 'a runtime-built predicate/ordering shape was rejected').toEqual([]);
  }, 60_000);

  it('can tell a missing field from a field that cannot be ordered', async () => {
    const db = await getDb();
    // `where()` runs its callback synchronously (measured: the throw's stack goes
    // through CollectionImpl.where), so the failure is a sync TypeError, not a
    // rejected promise — a `.then(_, onReject)` shape would miss it entirely.
    const attempt = async (s: Shape) => {
      try {
        await build(db, s);
        return null;
      } catch (e) {
        return String((e as Error).message);
      }
    };
    const missingField = await attempt({
      table: 'Document', field: 'nopeNotAField', method: 'eq', clause: 'where',
    });
    const unorderable = await attempt({
      table: 'CollectionValue', field: 'value', method: 'asc', clause: 'orderBy',
    });

    expect(missingField, 'a bogus field must not build').toContain('undefined');
    expect(unorderable, 'a Json column must not be orderable').toContain('not a function');
  }, 20_000);

  it('covers shapes collectChanges itself would never build', async () => {
    // This case does NOT gate the empty-parent-set short-circuit — a control run
    // removing it left every assertion green (`.in([])` legitimately returns 0
    // rows, the cost is round trips, and src/lib/sync/changes-scope-census.test.ts
    // is what guards that: 10 statements for an empty account, 15 without it).
    // What it does establish is the coverage difference: on an account with no
    // documents or collections, five of the fifteen specs build no query at all,
    // so a wrong field on them is invisible to collectChanges and visible here.
    const db = await getDb();
    const userId = crypto.randomUUID();
    await db.orm.public.User.create({
      id: userId,
      email: `sync-cap-${userId.slice(0, 8)}@example.com`,
      password: '!no-login-test-row',
    });
    try {
      const out = await collectChanges({ userId, since: null });
      for (const table of ['CollectionProperty', 'CollectionItem', 'CollectionView', 'CollectionValue']) {
        expect(out.changes[table], table).toEqual([]);
      }
      // The same account builds nothing for those specs; this list covers them
      // unconditionally, which is the gap being closed.
      const scoped = shapes.filter((s) => s.table.startsWith('Collection'));
      expect(scoped.length).toBeGreaterThanOrEqual(15);
    } finally {
      await db.orm.public.User.where({ id: userId }).delete();
      const left = await db.orm.public.User.where((u: any) => u.id.eq(userId)).select('id').all();
      expect(left.length, 'fixture user survived teardown').toBe(0);
    }
  }, 30_000);
});
