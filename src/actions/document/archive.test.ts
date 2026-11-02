import { config } from 'dotenv';

config();

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const { setDocumentArchived } = await import('./archive');
const { getArchivedDocuments, getDocuments } = await import('./get');

let db: Awaited<ReturnType<typeof getDb>>;
let ownerId = '';
let documentId = '';

beforeAll(async () => {
  db = await getDb();
  ownerId = crypto.randomUUID();
  await db.orm.public.User.create({
    id: ownerId,
    email: `g93-archive-${ownerId.slice(0, 8)}@example.com`,
    name: '归档测试',
    password: '!no-login-test-row',
  });
  session.userId = ownerId;
  documentId = crypto.randomUUID();
  await db.orm.public.Document.create({
    id: documentId,
    title: '要归档的文档',
    userId: ownerId,
    content: { type: 'doc', content: [] },
  });
});

afterAll(async () => {
  await db.orm.public.SyncEvent.where({ userId: ownerId }).delete();
  await db.orm.public.Document.where({ id: documentId }).delete();
  await db.orm.public.User.where({ id: ownerId }).delete();
});

describe('document archive (G93)', () => {
  it('archiving removes the document from normal lists and lists it in the archive', async () => {
    await setDocumentArchived(documentId, true);

    const archived = await getArchivedDocuments();
    expect(archived.map((doc) => doc.id)).toContain(documentId);

    const normal = await getDocuments();
    expect(normal.map((doc) => doc.id)).not.toContain(documentId);
  });

  it('unarchiving puts it back', async () => {
    await setDocumentArchived(documentId, false);
    expect((await getArchivedDocuments()).map((doc) => doc.id)).not.toContain(documentId);
    expect((await getDocuments()).map((doc) => doc.id)).toContain(documentId);
  });
});
