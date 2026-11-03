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
import {
  viewRequestApprovedTitle,
  viewRequestDeclinedTitle,
  viewRequestTitle,
} from '@/lib/share/request-access-copy';

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
  /** G75：同一个待处理队列里区分「想要查看」与「想要编辑」。 */
  kind: 'view' | 'edit';
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

async function notifyOwnerOfRequest(
  db: any,
  document: any,
  requesterId: string,
  kind: 'view' | 'edit' = 'edit',
) {
  const requester = await db.orm.public.User.first({ id: requesterId });
  const name = typeof requester?.name === 'string' && requester.name.trim()
    ? requester.name.trim()
    : '有人';
  const title = String(document.title ?? '无标题');
  const id = crypto.randomUUID();
  await db.orm.public.Notification.create({
    id,
    userId: document.userId,
    kind: 'document_access_request',
    documentId: String(document.id),
    // G75：查看请求用官方那句「…想要查看文档“[1]”」，编辑请求保留本地措辞。
    title: kind === 'view' ? viewRequestTitle(name, title) : `${name} 请求编辑「${title}」`,
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

/**
 * G75：查看者也能对"仅限协作者"的分享发起请求。用 `requested_view` 这一枚 role 值区分
 * （role 是字符串列，不需要新表/新列）：批准后落 `viewer`，编辑请求批准后落 `editor`。
 */
export async function requestViewAccess(identifier: string): Promise<{ status: RequestEditAccessStatus }> {
  const session = await auth();
  if (!session?.user?.id) return { status: 'signed-out' };
  const userId = session.user.id;

  const share = await findShare(identifier);
  if (!share || !isOpenableShare(share)) return { status: 'unavailable' };
  if (isExpired(share.expiresAt ? String(share.expiresAt) : null)) return { status: 'unavailable' };

  const db = await getDb();
  const documentId = String(share.documentId);
  const document = await db.orm.public.Document.first({ id: documentId });
  if (!document || document.isDeleted === true) return { status: 'unavailable' };

  if (document.userId === userId) return { status: 'owner' };
  // 链接本身已能看的档位（linkView/linkEdit）不需要"想要查看"。
  if (tierOpensToLink(share.permission)) return { status: 'already-member' };

  const existing = await db.orm.public.DocumentMember.first({ documentId, userId });
  if (existing) {
    if (existing.role === 'requested' || existing.role === 'requested_view') return { status: 'pending' };
    if (EXISTING_MEMBER_ROLES.includes(String(existing.role))) return { status: 'already-member' };
  }

  await db.orm.public.DocumentMember.create({
    id: crypto.randomUUID(),
    documentId,
    userId,
    role: 'requested_view',
    addedBy: userId,
  });
  await emitSyncEventSafe(db, document.userId, ['document_member'], documentId);
  await notifyOwnerOfRequest(db, document, userId, 'view');
  return { status: 'requested' };
}

export async function listAccessRequests(documentId: string): Promise<AccessRequestItem[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  await requireOwner(db, documentId, session.user.id);

  const rows: Record<string, unknown>[] = await db.orm.public.DocumentMember
    .where({ documentId })
    .all();
  const pending = rows.filter((row) => row.role === 'requested' || row.role === 'requested_view');

  const items: AccessRequestItem[] = [];
  for (const row of pending) {
    const user = await db.orm.public.User.first({ id: String(row.userId) });
    items.push({
      requesterId: String(row.userId),
      name: typeof user?.name === 'string' ? user.name : null,
      email: typeof user?.email === 'string' ? user.email : '',
      requestedAt: row.updatedAt ? String(row.updatedAt) : row.createdAt ? String(row.createdAt) : null,
      kind: row.role === 'requested_view' ? 'view' : 'edit',
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
  if (!member || (member.role !== 'requested' && member.role !== 'requested_view')) {
    throw new Error('该请求不存在');
  }
  const kind: 'view' | 'edit' = member.role === 'requested_view' ? 'view' : 'edit';
  const title = String(document.title ?? '无标题');

  if (approve) {
    await db.orm.public.DocumentMember.where({ id: String(member.id) }).update({
      // 查看请求只给 viewer；编辑请求仍给 editor。
      role: kind === 'view' ? 'viewer' : 'editor',
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
      ? kind === 'view'
        ? viewRequestApprovedTitle(title)
        : `「${title}」的编辑请求已批准`
      : kind === 'view'
        ? viewRequestDeclinedTitle(title)
        : `「${title}」的编辑请求被拒绝`,
    remindAt: nowIso(),
  });
  await emitSyncEventSafe(db, requesterId, ['notification'], notificationId);

  return { status: approve ? 'approved' : 'declined' };
}
