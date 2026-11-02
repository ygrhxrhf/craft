import { config } from 'dotenv';

config();

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ userId: '' }));

vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }));

const { getDb } = await import('@/prisma/db');
const {
  requestEditAccess,
  listAccessRequests,
  decideAccessRequest,
} = await import('./access-requests');

let db: Awaited<ReturnType<typeof getDb>>;
let ownerId = '';
let requesterId = '';
let documentId = '';
let shareToken = '';

async function clearMembers() {
  const rows = await db.orm.public.DocumentMember.where({ documentId }).all();
  for (const row of rows) await db.orm.public.DocumentMember.where({ id: String(row.id) }).delete();
}

async function clearNotifications() {
  for (const userId of [ownerId, requesterId]) {
    const rows = await db.orm.public.Notification.where({ userId }).all();
    for (const row of rows) await db.orm.public.Notification.where({ id: String(row.id) }).delete();
  }
}

async function clearEvents() {
  for (const userId of [ownerId, requesterId]) {
    const rows = await db.orm.public.SyncEvent.where({ userId }).all();
    for (const row of rows) await db.orm.public.SyncEvent.where({ id: String(row.id) }).delete();
  }
}

async function memberRow() {
  return db.orm.public.DocumentMember.first({ documentId, userId: requesterId }) as Promise<Record<string, unknown> | null>;
}

beforeAll(async () => {
  db = await getDb();
  ownerId = crypto.randomUUID();
  requesterId = crypto.randomUUID();
  for (const [id, name] of [[ownerId, '所有者'], [requesterId, '申请者']] as const) {
    await db.orm.public.User.create({
      id,
      email: `g04-request-${id.slice(0, 8)}@example.com`,
      name,
      password: '!no-login-test-row',
    });
  }

  documentId = crypto.randomUUID();
  shareToken = crypto.randomUUID();
  await db.orm.public.Document.create({
    id: documentId,
    title: '请求批准样本',
    userId: ownerId,
    content: { type: 'doc', content: [] },
  });
  await db.orm.public.DocumentShare.create({
    id: crypto.randomUUID(),
    documentId,
    token: shareToken,
    isPublished: true,
    permission: 'view',
  });
});

beforeEach(async () => {
  session.userId = requesterId;
  await clearMembers();
  await clearNotifications();
  await clearEvents();
  await db.orm.public.DocumentShare.where({ documentId }).update({
    isPublished: true,
    permission: 'view',
  });
});

afterAll(async () => {
  await clearMembers();
  await clearNotifications();
  await clearEvents();
  await db.orm.public.DocumentShare.where({ documentId }).delete();
  await db.orm.public.Document.where({ id: documentId }).delete();
  for (const id of [ownerId, requesterId]) {
    await db.orm.public.User.where({ id }).delete();
  }
});

describe('requestEditAccess', () => {
  it('creates a requested member row and notifies the owner', async () => {
    await expect(requestEditAccess(shareToken)).resolves.toEqual({ status: 'requested' });

    expect(await memberRow()).toMatchObject({ userId: requesterId, role: 'requested' });
    const notifications = await db.orm.public.Notification.where({ userId: ownerId }).all() as Record<string, unknown>[];
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      kind: 'document_access_request',
      documentId,
      title: '申请者 请求编辑「请求批准样本」',
    });
  });

  it('is idempotent while the request is pending', async () => {
    await requestEditAccess(shareToken);
    await expect(requestEditAccess(shareToken)).resolves.toEqual({ status: 'pending' });
    expect(await db.orm.public.DocumentMember.where({ documentId, role: 'requested' }).all()).toHaveLength(1);
    expect(await db.orm.public.Notification.where({ userId: ownerId }).all()).toHaveLength(1);
  });

  it('returns signed-out without a session', async () => {
    session.userId = '';
    await expect(requestEditAccess(shareToken)).resolves.toEqual({ status: 'signed-out' });
  });

  it('does not accept a missing or unpublished link', async () => {
    await expect(requestEditAccess(crypto.randomUUID())).resolves.toEqual({ status: 'unavailable' });
    await db.orm.public.DocumentShare.where({ documentId }).update({ isPublished: false });
    await expect(requestEditAccess(shareToken)).resolves.toEqual({ status: 'unavailable' });
  });

  it('reports an edit link as already-editor', async () => {
    await db.orm.public.DocumentShare.where({ documentId }).update({ permission: 'edit' });
    await expect(requestEditAccess(shareToken)).resolves.toEqual({ status: 'already-editor' });
    expect(await memberRow()).toBeNull();
  });
});

describe('owner decisions', () => {
  it('lists pending requests only for the owner', async () => {
    await requestEditAccess(shareToken);

    session.userId = ownerId;
    const rows = await listAccessRequests(documentId);
    expect(rows).toEqual([
      expect.objectContaining({ requesterId, name: '申请者', email: expect.stringContaining('g04-request-') }),
    ]);

    session.userId = requesterId;
    await expect(listAccessRequests(documentId)).rejects.toThrow('未授权');
  });

  it('approves by turning the requested row into editor', async () => {
    await requestEditAccess(shareToken);
    session.userId = ownerId;

    await expect(decideAccessRequest(documentId, requesterId, true)).resolves.toEqual({ status: 'approved' });
    expect(await memberRow()).toMatchObject({ role: 'editor', addedBy: ownerId });

    const requesterNotifications = await db.orm.public.Notification.where({ userId: requesterId }).all() as Record<string, unknown>[];
    expect(requesterNotifications).toEqual([
      expect.objectContaining({ kind: 'accessApproved', documentId }),
    ]);
  });

  it('declines by deleting the requested row', async () => {
    await requestEditAccess(shareToken);
    session.userId = ownerId;

    await expect(decideAccessRequest(documentId, requesterId, false)).resolves.toEqual({ status: 'declined' });
    expect(await memberRow()).toBeNull();
    const requesterNotifications = await db.orm.public.Notification.where({ userId: requesterId }).all() as Record<string, unknown>[];
    expect(requesterNotifications).toEqual([
      expect.objectContaining({ kind: 'accessDeclined', documentId }),
    ]);
  });

  it('refuses decisions from a non-owner', async () => {
    await requestEditAccess(shareToken);
    await expect(decideAccessRequest(documentId, requesterId, true)).rejects.toThrow('未授权');
    expect(await memberRow()).toMatchObject({ role: 'requested' });
  });
});
