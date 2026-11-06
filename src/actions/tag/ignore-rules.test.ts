import { config } from 'dotenv';

config();

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));
vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const { addIgnoreRule, deleteIgnoreRule, getIgnoreOverview, getIgnoreRules, renameIgnoreRule } = await import(
  './ignore-rules'
);
const { getTags } = await import('./tag');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';
const tagIds: string[] = [];

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  await db.orm.public.User.create({
    id: userId,
    email: `g171-${userId.slice(0, 8)}@example.com`,
    name: '忽略规则测试账号',
    // Not a credential: this row never logs in, the session is mocked above.
    password: '!no-login-test-row',
  });
  for (const [index, name] of ['草稿甲', '正式', '临时乙'].entries()) {
    const id = crypto.randomUUID();
    tagIds.push(id);
    await db.orm.public.Tag.create({ id, name, color: '#888888', userId, order: index });
  }
});

afterAll(async () => {
  for (const id of tagIds) await db.orm.public.Tag.where({ id }).delete();
  await db.orm.public.User.where({ id: userId }).delete();
});

describe('ignore rules engine (G171)', () => {
  it('adds a rule and hides matching tags from getTags, with the source annotation', async () => {
    session.userId = userId;
    const rules = await addIgnoreRule('草稿');
    expect(rules).toHaveLength(1);

    const visible = (await getTags()).map((tag) => tag.name);
    expect(visible).toContain('正式');
    expect(visible).not.toContain('草稿甲');

    const overview = await getIgnoreOverview();
    expect(overview.rules.map((rule) => rule.text)).toEqual(['草稿']);
    expect(overview.matches[overview.rules[0].id]).toEqual(['草稿甲']);
  });

  it('renames a rule and the filter follows the new text', async () => {
    session.userId = userId;
    const rules = await getIgnoreRules();
    await renameIgnoreRule(rules[0].id, '临时');

    const visible = (await getTags()).map((tag) => tag.name);
    expect(visible).toContain('草稿甲');
    expect(visible).not.toContain('临时乙');
  });

  it('deletes the rule and the tag comes back', async () => {
    session.userId = userId;
    const rules = await getIgnoreRules();
    await deleteIgnoreRule(rules[0].id);
    expect(await getIgnoreRules()).toEqual([]);
    expect((await getTags()).map((tag) => tag.name)).toContain('临时乙');
  });
});