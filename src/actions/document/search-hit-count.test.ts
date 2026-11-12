import { config } from 'dotenv';

// Real database: the claim under test is that the count is derived from the stored row
// (title + content blocks), which no stand-in reproduces.
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
const { hitCountLabel, HIT_COUNT_DISPLAY_CAP } = await import('@/lib/search/hit-count');

let db: any;
const userId = crypto.randomUUID();
const titleDocId = crypto.randomUUID();
const manyDocId = crypto.randomUUID();

const NEEDLE = 'hitK3';

// The title carries the needle once, one block carries it twice more ⇒ 3.
const TITLE_BODY = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: `one ${NEEDLE} two ${NEEDLE} three` }],
    },
  ],
};

// 60 blocks, each hit once ⇒ 60 raw hits, displayed under the sampled cap as `50+`.
const MANY_BODY = {
  type: 'doc',
  content: Array.from({ length: 60 }, (_, i) => ({
    type: 'paragraph',
    content: [{ type: 'text', text: `block ${i} has ${NEEDLE} inside` }],
  })),
};

beforeAll(async () => {
  db = await getDb();
  await db.orm.public.User.create({
    id: userId,
    email: `hit-count-${userId.slice(0, 8)}@example.com`,
    name: '命中计数测试账号',
    // Not a credential: this row never logs in, the session is mocked above.
    password: '!no-login-test-row',
  });
  await db.orm.public.Document.create({
    id: titleDocId,
    title: `标题 ${NEEDLE} 命中`,
    userId,
    content: TITLE_BODY,
    plainText: `one ${NEEDLE} two ${NEEDLE} three`,
  });
  await db.orm.public.Document.create({
    id: manyDocId,
    title: `另一篇 ${NEEDLE}`,
    userId,
    content: MANY_BODY,
    plainText: `block 0 has ${NEEDLE} inside`,
  });
  session.userId = userId;
});

afterAll(async () => {
  session.userId = '';
  await db.orm.public.Document.where({ id: titleDocId }).delete();
  await db.orm.public.Document.where({ id: manyDocId }).delete();
  await db.orm.public.User.where({ id: userId }).delete();
});

describe('the per-document hit count (G1419)', () => {
  it('counts title and block occurrences from the stored row', async () => {
    const result = await searchAll(NEEDLE);
    const doc = (result.documents as any[]).find((d) => d.id === titleDocId);
    expect(doc).toBeTruthy();
    expect(doc.hitCount).toBe(3);
  });

  it('counts every block hit, and the display caps past the sampled 50+', async () => {
    const result = await searchAll(NEEDLE);
    const doc = (result.documents as any[]).find((d) => d.id === manyDocId);
    expect(doc).toBeTruthy();
    expect(doc.hitCount).toBe(61); // title once + 60 blocks
    expect(hitCountLabel(doc.hitCount)).toBe(`${HIT_COUNT_DISPLAY_CAP}+`);
    expect(hitCountLabel(doc.hitCount)).toBe('50+');
  });
});
