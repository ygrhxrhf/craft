'use server';

import { getTable, requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { writeTombstones } from '@/lib/sync/tombstone-write';

export type MemberRole = 'editor' | 'commenter' | 'viewer';

const MEMBER_ROLES: MemberRole[] = ['editor', 'commenter', 'viewer'];

export interface DocumentMemberItem {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: MemberRole;
}

function assertRole(role: unknown): MemberRole {
  if (!MEMBER_ROLES.includes(role as MemberRole)) throw new Error('无效的协作者权限');
  return role as MemberRole;
}

export async function listDocumentMembers(documentId: string): Promise<DocumentMemberItem[]> {
  const userId = await requireUserId();
  await requireDocumentAccess(documentId, userId, 'viewer');

  const rows = await (await getTable('DocumentMember')).where({ documentId }).all();
  const users = await getTable('User');

  const items: DocumentMemberItem[] = [];
  for (const row of rows) {
    // G04：`requested` 是待批准的编辑请求，不是已授予的协作者；它走
    // listAccessRequests，不能混进成员名册。
    if (row.role === 'requested') continue;
    const account = await users.first({ id: row.userId as string });
    items.push({
      id: row.id as string,
      userId: row.userId as string,
      name: (account?.name as string) ?? null,
      email: (account?.email as string) ?? '',
      role: row.role as MemberRole,
    });
  }
  return items;
}

export interface MentionCandidate {
  userId: string;
  name: string | null;
  email: string;
}

/**
 * Who an `@` in this document may name: the invited members plus the owner, who
 * holds no `DocumentMember` row of their own. Craft states the range for a viewer
 * as "only people invited via email" (`collab.doc.viewer.mention.desc`).
 */
export async function listMentionCandidates(documentId: string): Promise<MentionCandidate[]> {
  const userId = await requireUserId();
  const { document } = await requireDocumentAccess(documentId, userId, 'viewer');

  const members = await getTable('DocumentMember');
  const users = await getTable('User');
  const rows = await members.where({ documentId }).all();

  const candidates: MentionCandidate[] = [];
  const owner = await users.first({ id: document.userId as string });
  if (owner) {
    candidates.push({
      userId: owner.id as string,
      name: (owner.name as string) ?? null,
      email: (owner.email as string) ?? '',
    });
  }
  for (const row of rows) {
    const account = await users.first({ id: row.userId as string });
    candidates.push({
      userId: row.userId as string,
      name: (account?.name as string) ?? null,
      email: (account?.email as string) ?? '',
    });
  }
  return candidates;
}

/**
 * 邀请前的服务端解析：校验所有者、把邮箱收敛成账号。不写 document_members——
 * 成员行的创建与改权限走客户端 applyLocal（'document_member'），离线可排队。
 * 已有协作者复用其 id，避免 @@unique([documentId, userId]) 再插一行。
 */
export async function resolveDocumentMember(input: {
  documentId: string;
  email: string;
  role: unknown;
}): Promise<DocumentMemberItem & { addedBy: string; existing: boolean }> {
  const userId = await requireUserId();
  const { document } = await requireDocumentAccess(input.documentId, userId, 'owner');
  const role = assertRole(input.role);

  const email = input.email.trim().toLowerCase();
  const users = await getTable('User');
  const account = await users.first({ email });
  if (!account) throw new Error('该邮箱尚未注册 Crafty');
  if (account.id === document.userId) throw new Error('文档所有者无需添加为协作者');

  const members = await getTable('DocumentMember');
  const existing = await members.first({ documentId: input.documentId, userId: account.id as string });

  return {
    id: (existing?.id as string) ?? crypto.randomUUID(),
    userId: account.id as string,
    name: (account.name as string) ?? null,
    email,
    role,
    addedBy: userId,
    existing: Boolean(existing),
  };
}

/**
 * G138 第二问（`collab.question.revoke.access`）：此人在**我拥有的其它文档**里还有几处单独授权。
 * 0 ＝ 没有第二问可答，调用方按"只从本文档移除"处理。
 */
export async function countMemberElsewhere(
  documentId: string,
  memberUserId: string,
): Promise<number> {
  const userId = await requireUserId();
  const documents = await getTable('Document');
  const owned = await documents.where({ userId, isDeleted: false }).all();
  const ownedIds = new Set(owned.map((row) => row.id as string));

  const members = await getTable('DocumentMember');
  const rows = await members.where({ userId: memberUserId }).all();
  return rows.filter((row) => row.documentId !== documentId && ownedIds.has(row.documentId as string)).length;
}

/**
 * G138「移除所有访问权限」：把该成员在**我拥有的全部文档**里的授权行删掉，返回删除条数。
 * 只动调用者自己拥有的文档——别人文档里的授权不归他管（服务端边界，不是界面提示）。
 *
 * G1643：`document_member` 没有 deletedAt，删行之后增量流里什么都不剩 ⇒ 所有者的**其他设备**
 * 会一直显示这位已被移除的协作者。删完补一枚墓碑事件（受众＝所有者自己）。
 */
export async function revokeMemberEverywhere(memberUserId: string): Promise<number> {
  const userId = await requireUserId();
  const documents = await getTable('Document');
  const owned = await documents.where({ userId, isDeleted: false }).all();
  const ownedIds = new Set(owned.map((row) => row.id as string));

  const members = await getTable('DocumentMember');
  const rows = await members.where({ userId: memberUserId }).all();
  let removed = 0;
  for (const row of rows) {
    if (!ownedIds.has(row.documentId as string)) continue;
    const memberId = String(row.id);
    await members.where({ id: memberId }).delete();
    await writeTombstones(await getDb(), {
      table: 'document_member',
      recordId: memberId,
      audience: [userId],
    });
    removed += 1;
  }
  return removed;
}

/**
 * G298 —— **成员自己离开共享文档**。与"所有者移除协作者"是两件事：这里调用者移除的是**自己**
 * 那一行。所有者不能离开自己的文档（他是 `Document.userId`，没有成员行可删）⇒ 拒绝。
 * 返回是否真的删掉了一行（没在名册里 ⇒ 无操作，不报错——幂等）。
 *
 * G1643：墓碑发给**文档所有者**——他的名册要少一行；离开者自己的镜像里从来没有这一行
 * （GET 侧成员行按"本人文档"收窄），发给他只是噪声。
 */
export async function leaveDocument(documentId: string): Promise<boolean> {
  const userId = await requireUserId();
  const members = await getTable('DocumentMember');
  const mine = await members.first({ documentId, userId });
  if (!mine) return false;
  const db = await getDb();
  await members.where({ id: mine.id as string }).delete();
  const document = await db.orm.public.Document.first({ id: documentId });
  const owner = typeof document?.userId === 'string' ? document.userId : '';
  if (owner) {
    await writeTombstones(db, {
      table: 'document_member',
      recordId: String(mine.id),
      audience: [owner],
    });
  }
  return true;
}
