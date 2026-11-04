'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { requireUserId } from '@/lib/authz/guard';
import { resolveDocumentAccess } from '@/lib/authz/document-access';
import type { ResourceRole } from '@/lib/authz/resource';

export interface AuthorizedDocument {
  [key: string]: unknown;
  id: string;
  title: string;
  icon: string | null;
  coverImage: string | null;
  coverType: string | null;
  width: string | null;
  pageStyle: unknown;
  content: unknown;
  role: ResourceRole;
}

export interface SubpageStats {
  wordCount: number;
  plainText: string;
  /** Not stored per page, so a subpage contributes none and the open page keeps its own count. */
  blockCount: number;
}

/**
 * The figures the "完整文档" reading adds to the open page (G67). Only the two columns it counts —
 * never `content`, which is why the tree read projects them away — and only pages nested under this
 * one that the actor already owns.
 */
export async function getSubpageStats(rootId: string): Promise<SubpageStats[]> {
  const userId = await requireUserId();
  const access = await resolveDocumentAccess(rootId, userId);
  if (!access) return [];

  const db = await getDb();
  const rows: Array<{ id: string; parentId: string | null; wordCount: number; plainText: string }> =
    await db.orm.public.Document
      .where({ userId, isDeleted: false })
      .select('id', 'parentId', 'wordCount', 'plainText')
      .all();

  const byParent = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const list = byParent.get(row.parentId) ?? [];
    list.push(row);
    byParent.set(row.parentId, list);
  }

  const stats: SubpageStats[] = [];
  const pending = [...(byParent.get(rootId) ?? [])];
  const seen = new Set<string>([rootId]);
  while (pending.length > 0) {
    const row = pending.pop()!;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    stats.push({ wordCount: row.wordCount ?? 0, plainText: row.plainText ?? '', blockCount: 0 });
    pending.push(...(byParent.get(row.id) ?? []));
  }
  return stats;
}

/**
 * G138：这篇文档带不带子页（分享面板只在多页文档上给「分享适用于整个文档」那一句）。
 * 只看调用者有权的文档；自己不是所有者时，别人的子页不计入。
 */
export async function countSubpages(rootId: string): Promise<number> {
  const userId = await requireUserId();
  const access = await resolveDocumentAccess(rootId, userId);
  if (!access) return 0;

  const db = await getDb();
  const rows: Array<{ id: string; parentId: string | null }> = await db.orm.public.Document
    .where({ userId, isDeleted: false })
    .select('id', 'parentId')
    .all();

  const byParent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const list = byParent.get(row.parentId) ?? [];
    list.push(row.id);
    byParent.set(row.parentId, list);
  }

  const seen = new Set<string>([rootId]);
  const pending = [...(byParent.get(rootId) ?? [])];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    pending.push(...(byParent.get(id) ?? []));
  }
  return seen.size - 1;
}

export async function getDocument(id: string): Promise<AuthorizedDocument | null> {
  const userId = await requireUserId();
  const access = await resolveDocumentAccess(id, userId);
  if (!access) return null;

  // G202：信息页的「作者」此前写死成「你」。作者是文档所有者（`Document.userId`），
  // 与公开页同一口径取 name（缺则退邮箱）；取不到就回 null，由 UI 退成占位符而不是谎报"你"。
  const db = await getDb();
  const ownerId = (access.document as { userId?: string }).userId;
  let authorName: string | null = null;
  if (ownerId) {
    const owner = await db.orm.public.User.first({ id: ownerId });
    authorName = (owner as { name?: string | null; email?: string | null } | null)?.name?.trim()
      || (owner as { email?: string | null } | null)?.email
      || null;
  }

  const merged: Record<string, unknown> = { ...access.document, role: access.role, authorName };
  return merged as unknown as AuthorizedDocument;
}

export async function getDocuments() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const docs: Array<{
    id: string;
    title: string;
    icon: string | null;
    parentId: string | null;
    folderId: string | null;
    isDeleted: boolean;
    isDailyNote: boolean;
    updatedAt: string;
    order: number;
  }> = [];

  // Projected on purpose. Without the column list the ORM selects every column of every row,
  // which for this tree means each document's `content` and `plainText`: asked of the database
  // directly, those two come to 119,517 + 11,230 bytes across the 605 rows this read returns,
  // against 42,340 bytes for every column the tree actually renders. Latency was measured and
  // discarded -- the same statement swung 130–1,302ms run to run, so only the byte count argues.
  const result = await db.orm.public.Document
    .where({ userId: session.user.id, isDeleted: false, isArchived: false, isDailyNote: false, isTemplate: false })
    .select('id', 'title', 'icon', 'parentId', 'folderId', 'isDeleted', 'isDailyNote', 'updatedAt', 'order')
    .orderBy((m: any) => m.updatedAt.desc())
    .all();

  for (const doc of result) {
    docs.push(doc as typeof docs[number]);
  }

  return docs;
}

export async function getDeletedDocuments() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const docs: Array<{
    id: string;
    title: string;
    icon: string | null;
    deletedAt: string | null;
  }> = [];

  const result = await db.orm.public.Document
    .where({ userId: session.user.id, isDeleted: true })
    .select('id', 'title', 'icon', 'deletedAt')
    .orderBy((m: any) => m.deletedAt.desc())
    .all();

  for (const doc of result) {
    docs.push(doc as typeof docs[number]);
  }

  return docs;
}

export async function getFavoriteDocuments() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const docs: Array<{
    id: string;
    title: string;
    icon: string | null;
    updatedAt: string;
    /** G94：收藏行自己的 id —— 重排要写 `favorite.order`，卡片的文档 id 不是这一行的主键。 */
    favoriteId: string;
  }> = [];

  const favorites = await db.orm.public.Favorite
    .where({ userId: session.user.id, deletedAt: null })
    .orderBy((m: any) => m.order.asc())
    .all();

  for (const fav of favorites) {
    // `isDeleted` is read to filter and then dropped: the card below never sees it.
    const doc = await db.orm.public.Document
      .where({ id: (fav as { documentId: string }).documentId })
      .select('id', 'title', 'icon', 'updatedAt', 'isDeleted', 'isArchived')
      .first() as { id: string; title: string; icon: string | null; updatedAt: string; isDeleted: boolean; isArchived: boolean } | null;
    if (doc && !doc.isDeleted && !doc.isArchived) {
      docs.push({
        id: doc.id,
        title: doc.title,
        icon: doc.icon,
        updatedAt: doc.updatedAt,
        favoriteId: String((fav as { id: string }).id),
      });
    }
  }

  return docs;
}

export async function getTemplates() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const docs: Array<{
    id: string;
    title: string;
    icon: string | null;
    updatedAt: string;
  }> = [];

  const result = await db.orm.public.Document
    .where({ userId: session.user.id, isTemplate: true, isDeleted: false })
    .select('id', 'title', 'icon', 'updatedAt')
    .orderBy((m: any) => m.updatedAt.desc())
    .all();

  for (const doc of result) {
    docs.push(doc as typeof docs[number]);
  }

  return docs;
}

export interface TemplateContent {
  title: string;
  content: unknown;
}

/** Body for 「从模板插入」. Scoped to the caller's own live templates so a
 *  missing, foreign, or deleted id all answer the same way. */
export async function getTemplateContent(documentId: string): Promise<TemplateContent> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const row = await db.orm.public.Document.first({
    id: documentId,
    userId: session.user.id,
    isTemplate: true,
    isDeleted: false,
  });
  if (!row) throw new Error('模板不存在');

  const template = row as { title: string; content: unknown };
  return { title: template.title, content: template.content };
}

export async function getRecentDocuments(limit = 20) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  type RecentDoc = {
    id: string;
    title: string;
    icon: string | null;
    updatedAt: string;
    createdAt: string;
    role: string;
    plainText: string;
    lastViewedAt: string | null;
    folderId: string | null;
    parentId: string | null;
    isDailyNote: boolean;
  };

  const docs: RecentDoc[] = [];

  const own = await db.orm.public.Document
    .where({ userId: session.user.id, isDeleted: false, isArchived: false })
    .select('id', 'title', 'icon', 'updatedAt', 'createdAt', 'plainText', 'lastViewedAt', 'folderId', 'parentId', 'isDailyNote')
    .orderBy((m: any) => m.updatedAt.desc())
    .all();

  for (const doc of own) {
    docs.push({ ...(doc as unknown as RecentDoc), role: 'owner' });
  }

  // Documents shared with me by a collaborator grant.
  const grants = await db.orm.public.DocumentMember
    .where({ userId: session.user.id })
    .all();

  for (const grant of grants) {
    // `userId` and `isDeleted` are read to filter and then dropped.
    const doc = await db.orm.public.Document
      .where({ id: (grant as { documentId: string }).documentId })
      .select('id', 'title', 'icon', 'updatedAt', 'createdAt', 'userId', 'isDeleted', 'isArchived', 'plainText', 'lastViewedAt', 'folderId', 'parentId', 'isDailyNote')
      .first() as {
        id: string; title: string; icon: string | null; updatedAt: string; createdAt: string;
        userId: string; isDeleted: boolean; isArchived: boolean; plainText: string; lastViewedAt: string | null;
        folderId: string | null; parentId: string | null; isDailyNote: boolean;
      } | null;
    if (!doc || doc.isDeleted || doc.isArchived) continue;
    if (doc.userId === session.user.id) continue;
    docs.push({
      id: doc.id,
      title: doc.title,
      icon: doc.icon,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      plainText: doc.plainText ?? '',
      lastViewedAt: doc.lastViewedAt ?? null,
      folderId: doc.folderId ?? null,
      parentId: doc.parentId ?? null,
      role: (grant as { role: string }).role,
      isDailyNote: doc.isDailyNote === true,
    });
  }

  docs.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return docs.slice(0, limit);
}

/** G93: the archive view — archived documents, newest archive-relevant update first. */
export async function getArchivedDocuments() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const docs = await db.orm.public.Document
    .where({ userId: session.user.id, isDeleted: false, isArchived: true })
    .select('id', 'title', 'icon', 'updatedAt')
    .orderBy((m: any) => m.updatedAt.desc())
    .all();

  return docs as Array<{ id: string; title: string; icon: string | null; updatedAt: string }>;
}
