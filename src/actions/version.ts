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

  // Save the current content as a version first so restore is never destructive
  const latest = await db.orm.public.DocumentVersion
    .where({ documentId: v.documentId })
    .orderBy((ver: any) => ver.version.desc())
    .limit(1)
    .all();
  await db.orm.public.DocumentVersion.create({
    id: crypto.randomUUID(),
    documentId: v.documentId,
    version: latest.length ? (latest[0] as any).version + 1 : 1,
    title: d.title,
    content: d.content,
    plainText: d.plainText,
    wordCount: d.wordCount,
  });

  const now = new Date().toISOString();
  await db.orm.public.Document.where({ id: v.documentId }).update({
    content: v.content,
    plainText: v.plainText,
    wordCount: v.wordCount,
    title: v.title,
    // title 属 DOC_META_COLS → bump metaUpdatedAt 才进增量流（I2 NOTE）
    metaUpdatedAt: now,
  } as Record<string, unknown>);
  await emitSyncEventSafe(db, session.user.id, ['document'], v.documentId);

  return { documentId: v.documentId, content: v.content };
}
