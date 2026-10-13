/* eslint-disable @typescript-eslint/no-explicit-any */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
// The database case below needs DATABASE_URL. Next.js loads .env at runtime,
// vitest does not.
config();

import { describe, expect, it } from 'vitest';
import { getDb } from '@/prisma/db';

/**
 * `db.orm.<ns>.<model>.where()` takes either a callback or a shorthand object.
 * The shorthand passes its value straight through as a SQL literal, so putting
 * an operator object in it does not build a filter — it compares the column
 * against the JSON text of that object. Measured on this database, all against
 * real rows:
 *
 *   where({ userId })                -> 3 rows
 *   where((d) => d.userId.eq(uid))   -> 3 rows
 *   where({ userId: { eq: uid } })   -> 0 rows, no error      <-- the trap
 *   where({ id: { in: [id] } })      -> 0 rows, no error      <-- the trap
 *   where({ updatedAt: { gt: ts } }) -> rejects: invalid input syntax for
 *                                       type timestamp with time zone
 *
 * Text and uuid columns swallow it, so a query goes from returning rows to
 * returning none with a green suite and no error anywhere — and every
 * `for (const row of rows)` under it simply stops running. Only the temporal
 * columns are loud. TypeScript is not a net at all: a control run injected both
 * `db.orm.public.Document.where({ id: { in: ids } })` and the string-keyed form
 * that src/lib/sync/changes.ts uses, and `tsc --noEmit` reported neither. This
 * census is the only thing between that refactor and a silently empty sidebar.
 */

// Longest first so `gte` is not read as `gt` plus a stray character.
const OPERATOR_KEY =
  /(^|[{,])\s*(?:"|')?(?:notIn|ilike|like|gte|lte|not|in|gt|lt|eq|ne)(?:"|')?\s*:/;


/** Blanks comments and string bodies, keeping every index and line number in place. */
function stripNonCode(src: string): string {
  const out: string[] = [];
  let state: 'code' | 'line' | 'block' | 'string' = 'code';
  let quote = '';
  let i = 0;
  const keep = (c: string) => (c === '\n' ? c : ' ');
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; out.push('  '); i += 2; continue; }
      if (c === '/' && n === '*') { state = 'block'; out.push('  '); i += 2; continue; }
      if (c === '"' || c === "'" || c === '`') {
        state = 'string'; quote = c; out.push(' '); i += 1; continue;
      }
      out.push(c); i += 1; continue;
    }
    if (state === 'line') { out.push(keep(c)); i += 1; if (c === '\n') state = 'code'; continue; }
    if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; out.push('  '); i += 2; continue; }
      out.push(keep(c)); i += 1; continue;
    }
    if (c === '\\') { out.push('  '); i += 2; continue; }
    if (c === quote) { state = 'code'; out.push(' '); i += 1; continue; }
    out.push(keep(c)); i += 1;
  }
  return out.join('');
}

/** Every `.where({ ... })` shorthand object in the file, with its source offset. */
function shorthandRegions(cleaned: string): { body: string; at: number }[] {
  const found: { body: string; at: number }[] = [];
  const open = /\.where\(\s*/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(cleaned))) {
    const brace = m.index + m[0].length;
    if (cleaned[brace] !== '{') continue; // callback form
    let depth = 0;
    let end = -1;
    for (let i = brace; i < cleaned.length; i += 1) {
      if (cleaned[i] === '{') depth += 1;
      else if (cleaned[i] === '}') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    // Unbalanced means the scanner failed, which must never read as "clean".
    if (end < 0) found.push({ body: cleaned.slice(brace, brace + 200), at: brace });
    else found.push({ body: cleaned.slice(brace, end + 1), at: brace });
  }
  return found;
}

function offenders(body: string): string[] {
  const hits: string[] = [];
  for (const part of body.split(/(?<=[{,])/)) {
    if (OPERATOR_KEY.test(part)) hits.push(part.trim().slice(0, 60));
  }
  if (/{/.test(body) && !/}/.test(body)) hits.push('<unterminated: scanner could not close it>');
  return hits;
}

const lineOf = (src: string, at: number) => src.slice(0, at).split('\n').length;

describe('where() shorthand census', () => {
  it('flags the trap shape and nothing else (fixtures)', () => {
    const bad = [
      "x.where({ id: { in: ids } })",
      "x.where({ collectionId: { in: ids } }).all()",
      "x.where({ OR: [{ a: 1 }, { name: { ilike: 'q' } }] })",
      "x.where({\n  updatedAt: { gt: since },\n})",
    ];
    const good = [
      'x.where({ id })',
      'x.where({ userId: input.userId, isDeleted: false })',
      'x.where((d) => d.id.in(ids))',
      'x.where({ config: { theme: 1 } })',
      "const cfg = { default: null, alt: file.name, target: 1 };",
      // Mentioned in prose, not executed — this is what makes the scanner safe to
      // keep in a repo whose comments document the trap.
      "// Callback form is required: the object form `.where({ id: { in: [] } })`",
    ];
    for (const src of bad) {
      const regions = shorthandRegions(stripNonCode(src));
      expect(regions.length, src).toBe(1);
      expect(offenders(regions[0].body), src).not.toEqual([]);
    }
    for (const src of good) {
      const regions = shorthandRegions(stripNonCode(src));
      for (const region of regions) {
        expect(offenders(region.body), `${src} flagged as a violation`).toEqual([]);
      }
    }
    // The comment case has to yield nothing at all once prose is stripped.
    expect(shorthandRegions(stripNonCode(good[5]))).toEqual([]);
  });

  it('finds no shorthand operator object anywhere in src/', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
          files.push(full);
        }
      }
    };
    walk(path.join(process.cwd(), 'src'));

    // Denominators: a broken walk or a broken matcher would otherwise report zero
    // violations by never looking.
    expect(files.length).toBeGreaterThan(200);

    const violations: string[] = [];
    let sites = 0;
    for (const file of files) {
      const src = readFileSync(file, 'utf-8');
      if (!src.includes('.where(')) continue;
      const cleaned = stripNonCode(src);
      const regions = shorthandRegions(cleaned);
      sites += regions.length;
      for (const region of regions) {
        for (const hit of offenders(region.body)) {
          violations.push(`${path.relative(process.cwd(), file)}:${lineOf(src, region.at)} ${hit}`);
        }
      }
    }
    expect(sites, 'no .where({ }) shorthand found anywhere — the matcher is broken').toBeGreaterThan(0);
    // A clean reading has to say how much ground it covered, or "0 violations"
    // cannot be told apart from "nothing was looked at".
    if (process.env['CENSUS_VERBOSE']) {
      console.info(`census: files=${files.length} shorthandSites=${sites} violations=${violations.length}`);
    }
    expect(violations, 'shorthand filter with an operator object returns 0 rows').toEqual([]);
  });
});

describe('the trap itself (live database)', () => {
  // Characterisation tests: they pin what the driver does today, so the comments
  // on it cannot rot quietly and an upstream fix is announced here rather than
  // discovered in production.
  it('matches nothing in the shorthand, returns rows through the callback', async () => {
    const db = await getDb();
    // Scope to one user: other suites leave documents behind for different
    // users, and a cross-user sample makes the id lookup below return fewer
    // rows than were sampled.
    const probe = await db.orm.public.Document.select('userId').limit(1).all();
    if (probe.length === 0) return; // empty dev database — nothing to compare
    const userId = String((probe[0] as any).userId);
    const seeded = await db.orm.public.Document
      .where((d: any) => d.userId.eq(userId))
      .select('id', 'userId')
      .limit(2)
      .all();
    if (seeded.length < 2) return; // not enough rows for one user — nothing to compare
    const ids = seeded.map((r: any) => String(r.id));

    const throughCallback = await db.orm.public.Document
      .where((d: any) => d.id.in(ids))
      .select('id')
      .all();
    const throughShorthand: any = await (db.orm.public.Document as any)
      .where({ id: { in: ids } })
      .select('id')
      .all();

    // The positive control first: the ids are real and reachable, so the 0 below
    // cannot come from an empty table.
    expect(throughCallback.length).toBe(ids.length);
    expect(throughShorthand.length, 'shorthand operator object silently matched nothing').toBe(0);

    // Same trap on `eq`, which is the shape a refactor to the shorthand would
    // most plausibly write.
    const eqCallback = await db.orm.public.Document
      .where((d: any) => d.userId.eq(userId))
      .select('id')
      .limit(3)
      .all();
    const eqShorthand: any = await (db.orm.public.Document as any)
      .where({ userId: { eq: userId } })
      .select('id')
      .limit(3)
      .all();
    expect(eqCallback.length).toBeGreaterThan(0);
    expect(eqShorthand.length).toBe(0);
  }, 20_000);

  it('is loud on a temporal column, which is why the census is about the quiet ones', async () => {
    const db = await getDb();
    const seeded = await db.orm.public.Document.select('id', 'updatedAt').limit(1).all();
    if (seeded.length === 0) return;
    const ts = new Date(Date.parse(String(seeded[0].updatedAt)) - 1000);

    const ok = await db.orm.public.Document
      .where((d: any) => d.updatedAt.gt(ts))
      .select('id')
      .all();
    expect(ok.length, 'positive control: the callback form finds rows').toBeGreaterThan(0);

    // The same operator object is rejected here instead of returning 0, because
    // postgres will not read JSON text as a timestamptz. Asserting only that it
    // does not resolve — the message comes from the server and is localised.
    await expect(
      (db.orm.public.Document as any).where({ updatedAt: { gt: ts } }).select('id').all(),
    ).rejects.toThrow();
  }, 20_000);
});

