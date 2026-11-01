'use server';

/* eslint-disable @typescript-eslint/no-explicit-any */
//
// Edit-access requests (G04). A pending request is a `document_member` row with
// role `requested`: the unique (documentId, userId) key gives idempotency, and
// `resolveDocumentAccess` already refuses any role outside editor/commenter/
// viewer, so a pending row grants nothing. Approving flips it to `editor`;
// declining deletes it. No new table is needed for the request lifecycle.

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { findShare, isOpenableShare } from '@/lib/share/resolve';
import { tierOpensToLink } from '@/lib/share/permission';
import { normalizeSharePermission } from '@/lib/share/permission';
import { isExpired } from '@/lib/share/publishing-options';

export type RequestEditAccessStatus =
  | 'requested'
  | 'pending'
  | 'already-member'
  | 'already-editor'
  | 'owner'
  | 'signed-out'
  | 'unavailable';

export interface AccessRequestItem {
  requesterId: string;
  name: string | null;
  email: string;
  requestedAt: string | null;
}

const EXISTING_MEMBER_ROLES = ['editor', 'commenter', 'viewer'];

function nowIso(): string {
  return new Date().toISOString();
}

async function requireOwner(db: any, documentId: string, userId: string) {
  const document = await db.orm.public.Document.first({ id: documentId });
  if (!document || document.isDeleted === true || document.userId !== userId) {
    throw new Error('未授权');
  }
  return document;
}

async function notifyOwnerOfRequest(db: any, document: any, requesterId: string) {
  const requester = await db.orm.public.User.first({ id: requesterId });
  const name = typeof requester?.name === 'string' && requester.name.trim()
    ? requester.name.trim()
    : '有人';
  const id = crypto.randomUUID();
  await db.orm.public.Notification.create({
    id,
    userId: document.userId,
    kind: 'accessRequest',
    documentId: String(document.id),
    title: `${name} 请求编辑「${String(document.title ?? '无标题')}」`,
    remindAt: nowIso(),
  });
  await emitSyncEventSafe(db, String(document.userId), ['notification'], id);
}

export async function requestEditAccess(identifier: string): Promise<{ status: RequestEditAccessStatus }> {
  const session = await auth();
  if (!session?.user?.id) return { status: 'signed-out' };
  const userId = session.user.id;

  const share = await findShare(identifier);
  if (!share || !isOpenableShare(share)) return { status: 'unavailable' };
  if (!tierOpensToLink(share.permission)) return { status: 'unavailable' };
  if (isExpired(share.expiresAt ? String(share.expiresAt) : null)) return { status: 'unavailable' };

  const db = await getDb();
  const documentId = String(share.documentId);
  const document = await db.orm.public.Document.first({ id: documentId });
  if (!document || document.isDeleted === true) return { status: 'unavailable' };

  if (document.userId === userId) return { status: 'owner' };
  // G131：五档里只有 linkView（旧值 view 归一）是"可看不可编"的链接档 ⇒ 请求编辑才有意义；
  // linkEdit 已是编辑档 ⇒ 直接告诉他已是编辑者。
  const tier = normalizeSharePermission(share.permission);
  if (tier === 'linkEdit') return { status: 'already-editor' };
  const existing = await db.orm.public.DocumentMember.first({ documentId, userId });
  if (existing) {
    if (existing.role === 'requested') return { status: 'pending' };
    if (EXISTING_MEMBER_ROLES.includes(String(existing.role))) return { status: 'already-member' };
  }

  await db.orm.public.DocumentMember.create({
    id: crypto.randomUUID(),
    documentId,
    userId,
    role: 'requested',
    addedBy: userId,
  });
  await emitSyncEventSafe(db, document.userId, ['document_member'], documentId);
  await notifyOwnerOfRequest(db, document, userId);
  return { status: 'requested' };
}

export async function listAccessRequests(documentId: string): Promise<AccessRequestItem[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  await requireOwner(db, documentId, session.user.id);

  const rows: Record<string, unknown>[] = await db.orm.public.DocumentMember
    .where({ documentId, role: 'requested' })
    .all();

  const items: AccessRequestItem[] = [];
  for (const row of rows) {
    const user = await db.orm.public.User.first({ id: String(row.userId) });
    items.push({
      requesterId: String(row.userId),
      name: typeof user?.name === 'string' ? user.name : null,
      email: typeof user?.email === 'string' ? user.email : '',
      requestedAt: row.updatedAt ? String(row.updatedAt) : row.createdAt ? String(row.createdAt) : null,
    });
  }
  return items;
}

export async function decideAccessRequest(
  documentId: string,
  requesterId: string,
  approve: boolean,
): Promise<{ status: 'approved' | 'declined' }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const document = await requireOwner(db, documentId, session.user.id);
  const member = await db.orm.public.DocumentMember.first({ documentId, userId: requesterId });
  if (!member || member.role !== 'requested') throw new Error('该请求不存在');

  if (approve) {
    await db.orm.public.DocumentMember.where({ id: String(member.id) }).update({
      role: 'editor',
      addedBy: session.user.id,
    });
  } else {
    await db.orm.public.DocumentMember.where({ id: String(member.id) }).delete();
  }
  await emitSyncEventSafe(db, session.user.id, ['document_member'], String(member.id));

  const notificationId = crypto.randomUUID();
  await db.orm.public.Notification.create({
    id: notificationId,
    userId: requesterId,
    kind: approve ? 'accessApproved' : 'accessDeclined',
    documentId,
    title: approve
      ? `「${String(document.title ?? '无标题')}」的编辑请求已批准`
      : `「${String(document.title ?? '无标题')}」的编辑请求被拒绝`,
    remindAt: nowIso(),
  });
  await emitSyncEventSafe(db, requesterId, ['notification'], notificationId);

  return { status: approve ? 'approved' : 'declined' };
}
