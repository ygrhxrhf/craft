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
  id: string;
  title: string;
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
  type Row = { id: string; title: string; parentId: string | null; wordCount: number; plainText: string };

  // One read per tree level instead of one read of every document the user owns: the old
  // `where({ userId })` pulled 832 rows (with their `plainText`) to walk a three-page subtree.
  const stats: SubpageStats[] = [];
  const seen = new Set<string>([rootId]);
  let frontier = [rootId];
  while (frontier.length > 0) {
    // Callback form, not `.where({ parentId: { in: frontier } })`: the shorthand sends its value
    // as a SQL literal and an operator object there matches nothing without erroring
    // (src/prisma/where-shorthand.test.ts).
    const rows: Row[] = await db.orm.public.Document
      .where((m: any) => m.parentId.in(frontier))
      .where({ userId, isDeleted: false })
      .select('id', 'title', 'parentId', 'wordCount', 'plainText')
      .all();

    frontier = [];
    for (const row of rows) {
      if (seen.has(row.id)) continue; // a cycle or a repeated child: stop rather than loop
      seen.add(row.id);
      stats.push({
        id: row.id,
        title: row.title,
        wordCount: row.wordCount ?? 0,
        plainText: row.plainText ?? '',
        blockCount: 0,
      });
      frontier.push(row.id);
    }
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
  // Same level-by-level walk as `getSubpageStats`: the whole-account read below it counted the
  // descendants of one root by materialising every document the user owns.
  const seen = new Set<string>([rootId]);
  let frontier = [rootId];
  while (frontier.length > 0) {
    const rows: Array<{ id: string; parentId: string | null }> = await db.orm.public.Document
      .where((m: any) => m.parentId.in(frontier))
      .where({ userId, isDeleted: false })
      .select('id', 'parentId')
      .all();

    frontier = [];
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      frontier.push(row.id);
    }
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
    updatedAt: string;
    plainText: string;
  }> = [];

  // G997: the trash row's content summary is the **stored snapshot**, never re-rendered from the
  // deleted document's `content` — that is what the official card preview shows (the last state
  // the server persisted). Only the trash read carries `plainText`; the live lists still do not.
  // G20: `updatedAt` feeds the card's 已更新 line, which the official trash card prints beside
  // the 最近删除 location.
  const result = await db.orm.public.Document
    .where({ userId: session.user.id, isDeleted: true })
    .select('id', 'title', 'icon', 'deletedAt', 'updatedAt', 'plainText')
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
  if (favorites.length === 0) return docs;

  // One read for every favorite instead of a `.first()` per row; the order still comes from the
  // favorite rows, so the merged list is rebuilt in that order below.
  const ids = favorites.map((fav: any) => String((fav as { documentId: string }).documentId));
  const rows = await db.orm.public.Document
    .where((m: any) => m.id.in(ids))
    .select('id', 'title', 'icon', 'updatedAt', 'isDeleted', 'isArchived')
    .all();
  const byId = new Map(
    (rows as unknown as Array<{ id: string; title: string; icon: string | null; updatedAt: string; isDeleted: boolean; isArchived: boolean }>)
      .map((doc) => [doc.id, doc]),
  );

  for (const fav of favorites) {
    const doc = byId.get(String((fav as { documentId: string }).documentId));
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

  // Bounded at the source: the caller renders `limit` cards, and the old read materialised every
  // live document (832 rows and their `plainText` for this account) only to sort and slice.
  const own = await db.orm.public.Document
    .where({ userId: session.user.id, isDeleted: false, isArchived: false })
    .select('id', 'title', 'icon', 'updatedAt', 'createdAt', 'plainText', 'lastViewedAt', 'folderId', 'parentId', 'isDailyNote')
    .orderBy((m: any) => m.updatedAt.desc())
    .limit(limit)
    .all();

  for (const doc of own) {
    docs.push({ ...(doc as unknown as RecentDoc), role: 'owner' });
  }

  // Documents shared with me by a collaborator grant.
  const grants = await db.orm.public.DocumentMember
    .where({ userId: session.user.id })
    .all();
  const sharedIds = grants.map((grant: any) => (grant as { documentId: string }).documentId);

  if (sharedIds.length > 0) {
    // One read for every grant instead of a `.first()` per grant. The tree this sits on is small
    // (a handful of grants per account), so the `limit` stays applied to the merged list below.
    const shared = await db.orm.public.Document
      .where((m: any) => m.id.in(sharedIds))
      .select('id', 'title', 'icon', 'updatedAt', 'createdAt', 'userId', 'isDeleted', 'isArchived', 'plainText', 'lastViewedAt', 'folderId', 'parentId', 'isDailyNote')
      .all();

    const roleByDoc = new Map<string, string>(
      grants.map((grant: any) => [String((grant as { documentId: string }).documentId), String((grant as { role: string }).role)]),
    );
    for (const doc of shared as unknown as Array<{
      id: string; title: string; icon: string | null; updatedAt: string; createdAt: string;
      userId: string; isDeleted: boolean; isArchived: boolean; plainText: string | null; lastViewedAt: string | null;
      folderId: string | null; parentId: string | null; isDailyNote: boolean;
    }>) {
      if (doc.isDeleted || doc.isArchived) continue;
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
        role: roleByDoc.get(doc.id) ?? 'viewer',
        isDailyNote: doc.isDailyNote === true,
      });
    }
  }

  docs.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return docs.slice(0, limit);
}

/** G955: the 与我共享 screen — documents a collaborator granted to me, with who granted them. */
export interface SharedWithMeDoc {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  createdAt: string;
  plainText: string;
  lastViewedAt: string | null;
  shared: true;
  sharedBy: string | null;
  role: string;
}

export async function getSharedWithMeDocuments(limit = 50): Promise<SharedWithMeDoc[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const grants = await db.orm.public.DocumentMember
    .where({ userId: session.user.id })
    .all();

  const roleByDoc = new Map<string, string>();
  for (const grant of grants) {
    const g = grant as { documentId: string; role: string };
    roleByDoc.set(g.documentId, g.role);
  }
  const docIds = [...roleByDoc.keys()];
  if (docIds.length === 0) return [];

  const rows = (await db.orm.public.Document
    .where((m: any) => m.id.in(docIds))
    .select('id', 'title', 'icon', 'updatedAt', 'createdAt', 'userId', 'isDeleted', 'isArchived', 'plainText', 'lastViewedAt')
    .all()) as Array<{
    id: string; title: string; icon: string | null; updatedAt: string; createdAt: string;
    userId: string; isDeleted: boolean; isArchived: boolean; plainText: string | null; lastViewedAt: string | null;
  }>;

  const ownerIds = [...new Set(rows.map((row) => row.userId))];
  const owners = ownerIds.length === 0
    ? []
    : (await db.orm.public.User
      .where((m: any) => m.id.in(ownerIds))
      .select('id', 'name', 'email')
      .all()) as Array<{ id: string; name: string | null; email: string | null }>;
  const ownerById = new Map(owners.map((owner) => [owner.id, owner]));

  const docs: SharedWithMeDoc[] = [];
  for (const doc of rows) {
    if (doc.isDeleted || doc.isArchived) continue;
    if (doc.userId === session.user.id) continue;

    const owner = ownerById.get(doc.userId);
    docs.push({
      id: doc.id,
      title: doc.title,
      icon: doc.icon,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      plainText: doc.plainText ?? '',
      lastViewedAt: doc.lastViewedAt ?? null,
      shared: true,
      sharedBy: owner?.name?.trim() || owner?.email || null,
      role: roleByDoc.get(doc.id) ?? 'viewer',
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
