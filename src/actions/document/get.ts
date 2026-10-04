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

export async function getDocument(id: string): Promise<AuthorizedDocument | null> {
  const userId = await requireUserId();
  const access = await resolveDocumentAccess(id, userId);
  if (!access) return null;
  return { ...access.document, role: access.role } as AuthorizedDocument;
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
    .where({ userId: session.user.id, isDeleted: false, isDailyNote: false, isTemplate: false })
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
  }> = [];

  const favorites = await db.orm.public.Favorite
    .where({ userId: session.user.id })
    .orderBy((m: any) => m.order.asc())
    .all();

  for (const fav of favorites) {
    // `isDeleted` is read to filter and then dropped: the card below never sees it.
    const doc = await db.orm.public.Document
      .where({ id: (fav as { documentId: string }).documentId })
      .select('id', 'title', 'icon', 'updatedAt', 'isDeleted')
      .first() as { id: string; title: string; icon: string | null; updatedAt: string; isDeleted: boolean } | null;
    if (doc && !doc.isDeleted) {
      docs.push({ id: doc.id, title: doc.title, icon: doc.icon, updatedAt: doc.updatedAt });
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

export async function getRecentDocuments(limit = 20) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  type RecentDoc = {
    id: string;
    title: string;
    icon: string | null;
    updatedAt: string;
    role: string;
  };

  const docs: RecentDoc[] = [];

  const own = await db.orm.public.Document
    .where({ userId: session.user.id, isDeleted: false })
    .select('id', 'title', 'icon', 'updatedAt')
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
      .select('id', 'title', 'icon', 'updatedAt', 'userId', 'isDeleted')
      .first() as {
        id: string; title: string; icon: string | null; updatedAt: string;
        userId: string; isDeleted: boolean;
      } | null;
    if (!doc || doc.isDeleted) continue;
    if (doc.userId === session.user.id) continue;
    docs.push({
      id: doc.id,
      title: doc.title,
      icon: doc.icon,
      updatedAt: doc.updatedAt,
      role: (grant as { role: string }).role,
    });
  }

  docs.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return docs.slice(0, limit);
}
