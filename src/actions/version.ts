'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { requireDocumentAccess } from '@/lib/authz/document-access';

/**
 * `gap.md` G18 —— 备份/历史版本对**协作者**可用（官方 `commands.view.backups`「查看备份」是
 * 文档级一等入口，`plans.md` 的 30/180 天额度是同一功能的两端）。
 * ☆ 此前四个函数一律 `doc.userId !== session.user.id` ⇒ **editor 看不到也恢复不了**；现在统一
 *   走 `requireDocumentAccess(…, 'editor')`：所有者满足任何档、`editor` 协作者也满足。
 * ☆ 为什么是 `editor` 而不是 `viewer`：恢复会**改写正文**（`restoreVersion` 直接写 Document 行），
 *   属写操作；只读协作者不该能回滚别人的编辑。
 */
async function requireEditor(documentId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  await requireDocumentAccess(documentId, session.user.id, 'editor');
  return session.user.id;
}

export interface VersionItem {
  id: string;
  version: number;
  title: string;
  plainText: string;
  wordCount: number;
  createdAt: string;
}

export async function createVersion(documentId: string) {
  const userId = await requireEditor(documentId);

  const db = await getDb();
  const doc = await db.orm.public.Document.first({ id: documentId });
  if (!doc) throw new Error('文档不存在');
  const d = doc as any;

  const latest = await db.orm.public.DocumentVersion
    .where({ documentId })
    .orderBy((v: any) => v.version.desc())
    .limit(1)
    .all();
  const nextVersion = latest.length ? (latest[0] as any).version + 1 : 1;

  return db.orm.public.DocumentVersion.create({
    id: crypto.randomUUID(),
    documentId,
    version: nextVersion,
    title: d.title,
    content: d.content,
    plainText: d.plainText,
    wordCount: d.wordCount,
  });
}

export async function getVersions(documentId: string): Promise<VersionItem[]> {
  await requireEditor(documentId);

  const db = await getDb();

  const versions = await db.orm.public.DocumentVersion
    .where({ documentId })
    .orderBy((v: any) => v.version.desc())
    .all();

  return versions.map((v: any) => ({
    id: v.id,
    version: v.version,
    title: v.title,
    plainText: v.plainText,
    wordCount: v.wordCount,
    createdAt: v.createdAt,
  }));
}

export async function getVersionContent(versionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const version = await db.orm.public.DocumentVersion.first({ id: versionId });
  if (!version) throw new Error('版本不存在');

  await requireDocumentAccess((version as any).documentId, session.user.id, 'editor');

  return version as any;
}

export async function restoreVersion(versionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const version = await db.orm.public.DocumentVersion.first({ id: versionId });
  if (!version) throw new Error('版本不存在');
  const v = version as any;

  await requireDocumentAccess(v.documentId, session.user.id, 'editor');
  const doc = await db.orm.public.Document.first({ id: v.documentId });
  if (!doc) throw new Error('文档不存在');
  const d = doc as any;

  // G230：恢复是**产出新文档再导航**，不是就地回滚。判据＝官方 `backup.go.to.restored.document`
  //   「转至已恢复的文档」——有"已恢复的文档"可去，说明恢复留下了独立实体；就地改写会让人留在原页。
  //   于是原文档一字不动，这里按版本内容新建一行（正文随行带走，故走服务端 action，与 create-local
  //   里"带正文的创建仍走服务端"同一口径）。
  //
  // 样式取自**那一版自己的 meta**：旧代码从当前文档抄 icon/封面/页宽/页样式，等于恢复正文却留着
  // 后来的外观。meta 是后加的列，老版本行没有它 —— 那种情况才退回当前文档的值。
  const snapshotMeta = (v.meta && typeof v.meta === 'object' ? v.meta : {}) as Record<string, unknown>;
  const styleFrom = { ...(d as Record<string, unknown>), ...snapshotMeta };

  const now = new Date().toISOString();
  const restored = await db.orm.public.Document.create({
    id: crypto.randomUUID(),
    title: v.title,
    userId: session.user.id,
    parentId: null,
    folderId: d.folderId ?? null,
    icon: (styleFrom.icon as string | null) ?? null,
    coverImage: (styleFrom.coverImage as string | null) ?? null,
    coverType: (styleFrom.coverType as string | null) ?? null,
    content: v.content,
    plainText: v.plainText ?? '',
    wordCount: v.wordCount ?? 0,
    width: (styleFrom.width as string | null) ?? null,
    pageStyle: (styleFrom.pageStyle as unknown) ?? null,
    isTemplate: false,
    isDailyNote: false,
    dailyNoteDate: null,
    // 新行必须带 metaUpdatedAt，否则永远进不了增量流（document 的 tsCol 无默认值）。
    metaUpdatedAt: now,
  });

  const newId = (restored as any).id ?? now;
  await emitSyncEventSafe(db, session.user.id, ['document'], newId);

  return { documentId: newId, content: v.content };
}
