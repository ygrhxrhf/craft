import { config } from 'dotenv';

// The actions go through the real ORM, so vitest needs the same .env Next loads at runtime.
config();

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

/* Only the session is faked — the row bookkeeping has to be the real thing. */
vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const { permanentDeleteDocument, emptyTrash } = await import('@/actions/document/delete');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';
let doomedDocId = '';
let keptDocId = '';
let trashedDocId = '';
let inboxTaskId = '';

const tasksOf = async (documentIds: string[]) => {
  const rows = await db.orm.public.Task
    .where((r: any) => r.documentId.in(documentIds))
    .select('id')
    .all();
  return rows.map((row: { id: string }) => String(row.id));
};

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  await db.orm.public.User.create({
    id: userId,
    email: `doc-perm-${userId.slice(0, 8)}@example.com`,
    name: '永久删除级联测试账号',
    // Not a credential: this row never logs in, the session is mocked above.
    password: '!no-login-test-row',
  });

  doomedDocId = crypto.randomUUID();
  await db.orm.public.Document.create({ id: doomedDocId, userId, title: '要永久删除的文档' });
  keptDocId = crypto.randomUUID();
  await db.orm.public.Document.create({ id: keptDocId, userId, title: '留着的文档' });
  trashedDocId = crypto.randomUUID();
  await db.orm.public.Document.create({
    id: trashedDocId,
    userId,
    title: '回收站文档',
    isDeleted: true,
  });

  await db.orm.public.Task.create({
    id: crypto.randomUUID(), userId, documentId: doomedDocId, title: '随文档一起消失的任务',
  });
  await db.orm.public.Task.create({
    id: crypto.randomUUID(), userId, documentId: keptDocId, title: '留着文档里的任务',
  });
  await db.orm.public.Task.create({
    id: crypto.randomUUID(), userId, documentId: trashedDocId, title: '回收站文档里的任务',
  });
  inboxTaskId = crypto.randomUUID();
  await db.orm.public.Task.create({ id: inboxTaskId, userId, title: '收件箱任务' });

  session.userId = userId;
});

afterAll(async () => {
  await db.orm.public.Task.where({ userId }).delete();
  for (const id of [doomedDocId, keptDocId, trashedDocId]) {
    await db.orm.public.Document.where({ id }).delete();
  }
  await db.orm.public.User.where({ id: userId }).delete();
});

describe('permanent delete against the real tables', () => {
  it('removes the document and the task rows that lived in it', async () => {
    expect(await tasksOf([doomedDocId])).toHaveLength(1);

    await permanentDeleteDocument(doomedDocId);

    expect(await db.orm.public.Document.first({ id: doomedDocId })).toBeNull();
    // SetNull would have left a row with documentId = null; the cascade must leave none.
    expect(await tasksOf([doomedDocId])).toHaveLength(0);
    expect(await db.orm.public.Task.first({ title: '随文档一起消失的任务' })).toBeNull();
  });

  it('leaves the other documents’ tasks and the inbox alone', async () => {
    expect(await tasksOf([keptDocId, trashedDocId])).toHaveLength(2);
    expect(await db.orm.public.Task.first({ id: inboxTaskId })).not.toBeNull();
  });
});

describe('emptyTrash against the real tables', () => {
  it('empties the trash and takes its task rows with it', async () => {
    expect(await db.orm.public.Document.first({ id: trashedDocId })).not.toBeNull();

    const removed = await emptyTrash();

    expect(removed).toBe(1);
    expect(await db.orm.public.Document.first({ id: trashedDocId })).toBeNull();
    expect(await tasksOf([trashedDocId])).toHaveLength(0);
  });

  it('leaves live documents and their tasks in place', async () => {
    expect(await db.orm.public.Document.first({ id: keptDocId })).not.toBeNull();
    expect(await tasksOf([keptDocId])).toHaveLength(1);
  });
});
