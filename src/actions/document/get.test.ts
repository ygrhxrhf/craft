import { config } from 'dotenv';

// The action reads through the real ORM, so vitest needs the same .env Next loads at runtime.
config();

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

/* Only the session is faked. An in-memory stand-in would not show which columns the query
 * actually asks the database for, and that is the whole content of this test. */
vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const {
  getDocuments,
  getDeletedDocuments,
  getFavoriteDocuments,
  getRecentDocuments,
  getTemplateContent,
  getTemplates,
} = await import('@/actions/document/get');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';
let otherUserId = '';
let documentId = '';
let trashedId = '';
let templateId = '';
let sharedId = '';

// ~40k characters of body, so "the tree read does not carry bodies" is a claim about a real
// payload rather than about an empty default.
const BODY = {
  type: 'doc',
  content: Array.from({ length: 300 }, (_, i) => ({
    type: 'paragraph',
    content: [{ type: 'text', text: `段落 ${i} ${'填充文本'.repeat(20)}` }],
  })),
};

const TREE_COLUMNS = [
  'id',
  'title',
  'icon',
  'parentId',
  'folderId',
  'isDeleted',
  'isDailyNote',
  'updatedAt',
  'order',
];

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  await db.orm.public.User.create({
    id: userId,
    email: `sidebar-projection-${userId.slice(0, 8)}@example.com`,
    name: '侧栏投影测试账号',
    // Not a credential: this row never logs in, the session is mocked above.
    password: '!no-login-test-row',
  });
  documentId = crypto.randomUUID();
  await db.orm.public.Document.create({
    id: documentId,
    title: '侧栏投影样本',
    userId,
    content: BODY,
  });
  // The other four list reads each need a row that actually reaches their filter, or a
  // projection assertion on an empty result would pass for the wrong reason.
  trashedId = crypto.randomUUID();
  await db.orm.public.Document.create({
    id: trashedId,
    title: '回收站样本',
    userId,
    content: BODY,
    isDeleted: true,
  });
  templateId = crypto.randomUUID();
  await db.orm.public.Document.create({
    id: templateId,
    title: '模板样本',
    userId,
    content: BODY,
    isTemplate: true,
  });
  await db.orm.public.Favorite.create({
    id: crypto.randomUUID(),
    userId,
    documentId,
    order: 1,
  });
  // A grant from a second account: without this row the collaborator half of
  // getRecentDocuments is never reached, and that is the half whose read shape changed.
  otherUserId = crypto.randomUUID();
  await db.orm.public.User.create({
    id: otherUserId,
    email: `sidebar-grantor-${otherUserId.slice(0, 8)}@example.com`,
    name: '共享来源测试账号',
    password: '!no-login-test-row',
  });
  sharedId = crypto.randomUUID();
  await db.orm.public.Document.create({
    id: sharedId,
    title: '别人共享给我的文档',
    userId: otherUserId,
    content: BODY,
  });
  await db.orm.public.DocumentMember.create({
    id: crypto.randomUUID(),
    documentId: sharedId,
    userId,
    role: 'editor',
  });
  session.userId = userId;
});

afterAll(async () => {
  await db.orm.public.Favorite.where({ userId }).delete();
  await db.orm.public.DocumentMember.where({ userId }).delete();
  await db.orm.public.Document.where({ id: documentId }).delete();
  await db.orm.public.Document.where({ id: trashedId }).delete();
  await db.orm.public.Document.where({ id: templateId }).delete();
  await db.orm.public.Document.where({ id: sharedId }).delete();
  await db.orm.public.User.where({ id: userId }).delete();
  await db.orm.public.User.where({ id: otherUserId }).delete();
});

describe('the sidebar document read', () => {
  it('returns the tree columns and no document body', async () => {
    const rows = await getDocuments();
    const row = rows.find((r) => (r as { id: string }).id === documentId);
    // The narrowing must not pass by returning less than the tree needs.
    expect(row?.title).toBe('侧栏投影样本');
    expect(Object.keys(row ?? {}).sort()).toEqual([...TREE_COLUMNS].sort());
  });

  it('still leaves the full row readable by the document route', async () => {
    // Guard for the opposite mistake: projecting the list read must not touch the stored row.
    const stored = await db.orm.public.Document.first({ id: documentId });
    expect((stored as { content: unknown }).content).toBeTruthy();
    expect((stored as { title: string }).title).toBe('侧栏投影样本');
  });
});

describe('the single-document read carries the author name (G202)', () => {
  it('resolves the owner display name instead of leaving the panel to hard-code it', async () => {
    // 信息页的「作者」此前写死成「你」；这条读回真正的所有者名（缺则邮箱），UI 才有得显示。
    const { getDocument } = await import('./get');
    const doc = await getDocument(documentId);
    expect(doc).toBeTruthy();
    const authorName = (doc as unknown as { authorName?: unknown }).authorName;
    expect(typeof authorName).toBe('string');
    expect((authorName as string).length).toBeGreaterThan(0);
  });
});

// Every one of these feeds a card or a trash row, which renders four columns at most. Asked of
// the database directly, the body columns this read used to carry come to 119,517 + 11,230 bytes
// across the 605 rows the busiest account has in the tree, against 42,340 bytes for everything
// that is rendered — timings were measured and dropped, the same statement swinging tenfold
// between runs.
describe('the other document list reads', () => {
  const keys = (rows: unknown) =>
    (rows as Array<Record<string, unknown>>).map((r) => Object.keys(r).sort());

  it('getDeletedDocuments returns only what the trash row renders', async () => {
    const rows = await getDeletedDocuments();
    expect(rows.map((r) => (r as { id: string }).id)).toContain(trashedId);
    expect(keys(rows)).toEqual(
      rows.map(() => ['deletedAt', 'icon', 'id', 'title'].sort())
    );
  });

  it('getTemplates returns only what the template card renders', async () => {
    const rows = await getTemplates();
    expect(rows.map((r) => (r as { id: string }).id)).toContain(templateId);
    expect(keys(rows)).toEqual(rows.map(() => ['icon', 'id', 'title', 'updatedAt'].sort()));
  });

  it('getFavoriteDocuments returns only what the card renders', async () => {
    const rows = await getFavoriteDocuments();
    expect(rows.map((r) => (r as { id: string }).id)).toContain(documentId);
    expect(keys(rows)).toEqual(rows.map(() => ['icon', 'id', 'title', 'updatedAt'].sort()));
  });

  it('getRecentDocuments returns the columns the card and list render, plus the role it stamps on', async () => {
    const rows = await getRecentDocuments(8);
    expect(rows.map((r) => (r as { id: string }).id)).toContain(documentId);
    // `createdAt` joined the projection for the list layout's 已创建 column (G1113); the grid
    // simply ignores it. `plainText` joined for the list row's content-summary subtitle (G248),
    // `lastViewedAt` for the list's 上次浏览 column (G610), and `folderId`/`parentId` so the
    // card head can resolve its location breadcrumb (G250). The guard still holds: nothing else
    // may ride along.
    expect(keys(rows)).toEqual(
      rows.map(() =>
        [
          'createdAt', 'folderId', 'icon', 'id', 'lastViewedAt', 'parentId',
          'plainText', 'role', 'title', 'updatedAt',
        ].sort()
      )
    );
    // The collaborator branch has its own projection; nothing else in this file reaches it.
    const shared = rows.find((r) => (r as { id: string }).id === sharedId) as
      | { role: string; title: string }
      | undefined;
    expect(shared?.role).toBe('editor');
    expect(shared?.title).toBe('别人共享给我的文档');
  });
});

/**
 * G19 从模板插入 (`commands.insert.template.inline`) needs the template *body*, which the card read
 * above deliberately withholds — a card renders a title, not a document. The two refusal cases are
 * the point: the id arrives from the client, so neither a plain document nor someone else's
 * template may ride in through this read, and both must answer with the same sentence so the error
 * cannot be used to tell them apart.
 */
describe('getTemplateContent', () => {
  it('returns the body the card read withholds, for the owner', async () => {
    const template = await getTemplateContent(templateId);
    expect(template.title).toBe('模板样本');
    expect(template.content).toMatchObject({ type: 'doc' });
    expect((template.content as { content: unknown[] }).content).toHaveLength(300);
  });

  it('refuses an ordinary document wearing a template id', async () => {
    await expect(getTemplateContent(documentId)).rejects.toThrow('模板不存在');
  });

  it("refuses another owner's template with the same sentence", async () => {
    const foreign = crypto.randomUUID();
    await db.orm.public.Document.create({
      id: foreign,
      title: '别人的模板',
      userId: otherUserId,
      content: BODY,
      isTemplate: true,
    });
    try {
      await expect(getTemplateContent(foreign)).rejects.toThrow('模板不存在');
    } finally {
      await db.orm.public.Document.where({ id: foreign }).delete();
    }
  });
});
