'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { parsePinnedDocumentIds } from '@/lib/folder/pinned-doc';

export async function getFolders() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const folders: Array<{
    id: string;
    name: string;
    icon: string | null;
    /** G338：文件夹描述（独立字段，独立 mutation）。 */
    description: string | null;
    parentId: string | null;
    order: number;
    isDeleted: boolean;
  }> = [];

  const result = await db.orm.public.Folder
    .where({ userId: session.user.id, isDeleted: false })
    .orderBy((m: any) => m.order.asc())
    .all();

  for (const folder of result) {
    folders.push(folder as typeof folders[number]);
  }

  return folders;
}

/**
 * G121：`craft://folder/{id}` 的落点。文件夹屏读自身行、直属子文件夹与直属文档；
 * 不属于当前用户或已删除的 id 回 `null`，页面据此 `notFound()`。
 */
export async function getFolderPage(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const folder = await db.orm.public.Folder.first({ id });
  if (!folder || folder.userId !== session.user.id || folder.isDeleted) return null;

  type FolderRow = typeof folder;
  type DocRow = {
    id: string;
    title: string;
    icon: string | null;
    updatedAt: string;
  };

  const children: FolderRow[] = [];
  const childRows = await db.orm.public.Folder
    .where({ userId: session.user.id, isDeleted: false, parentId: id })
    .orderBy((m: any) => m.order.asc())
    .all();
  for (const child of childRows) children.push(child as FolderRow);

  const documents: DocRow[] = [];
  const docRows = await db.orm.public.Document
    .where({
      userId: session.user.id,
      folderId: id,
      isDeleted: false,
      isArchived: false,
      isDailyNote: false,
      isTemplate: false,
    })
    .select('id', 'title', 'icon', 'updatedAt')
    .orderBy((m: any) => m.updatedAt.desc())
    .all();
  for (const doc of docRows) documents.push(doc as DocRow);

  // G338：官方 `Folder pinned doc` 事件写进 `pinnedDocumentIds` 的那一枚（数组只放 0/1 个）。
  // 固定不改变文档自己的所在文件夹，所以这一枚可能不在上面的 documents 里。
  const pinnedId = parsePinnedDocumentIds(
    (folder as { pinnedDocumentIds?: unknown }).pinnedDocumentIds
  )[0];
  let pinned: DocRow | null = null;
  if (pinnedId) {
    const row = await db.orm.public.Document.first({ id: pinnedId });
    const doc = row as DocRow & { userId: string; isDeleted: boolean } | null;
    if (doc && doc.userId === session.user.id && !doc.isDeleted) {
      pinned = { id: doc.id, title: doc.title, icon: doc.icon, updatedAt: doc.updatedAt };
    }
  }

  return { folder, children, documents, pinned };
}
