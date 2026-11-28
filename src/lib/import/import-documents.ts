import { assertOwned } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { parseMarkdownWithIcon, titleFromMarkdown } from '@/lib/import/markdown';
import { serializeDocument } from '@/lib/document-codec';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

/**
 * Markdown → 文档的写入核心。
 *
 * 两个入口共用这里：界面上的导入（`actions/document/import.ts`，走 cookie 会话）和
 * xsxz 的推送（`POST /api/v1/import/markdown`，走 MCP 写令牌）。差别只在"userId 从哪来"，
 * 所以这一层显式收 `userId`，不碰 `auth()`。
 *
 * `documentId` 是推送的幂等键：xsxz 侧记着自己上次推出来的文档 id，第二次推就走更新而不是
 * 又建一篇。文档被删了就回 `not_found`，由调用方清掉本地映射后重推。
 */

export const IMPORT_FOLDER = 'Imported Notes';
export const MAX_IMPORT_FILES = 20;
export const MAX_IMPORT_CHARS = 500_000;

export type ImportErrorCode = 'empty' | 'too_large' | 'not_found' | 'invalid_parent';

export class ImportError extends Error {
  constructor(
    readonly code: ImportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

export interface MarkdownFile {
  name: string;
  text: string;
  /** 已存在的目标文档 id；给了就更新那一篇。 */
  documentId?: string | null;
  /** 挂成这篇文档的子页面。 */
  parentDocumentId?: string | null;
}

export interface ImportedDocument {
  id: string;
  title: string;
  created: boolean;
}

type Row = Record<string, unknown>;
type Db = Awaited<ReturnType<typeof getDb>>;

async function resolveFolder(
  db: Db,
  userId: string,
  input: { folderId?: string | null; folderName?: string | null; folderIcon?: string },
): Promise<string> {
  if (input.folderId) {
    await assertOwned('Folder', input.folderId, userId, '目标文件夹不存在');
    return input.folderId;
  }

  const name = input.folderName?.trim() || IMPORT_FOLDER;
  const folders = (await db.orm.public.Folder.where({ userId }).all()) as Row[];
  const existing = folders.find((folder) => folder.name === name && !folder.isDeleted);
  if (existing) return String(existing.id);

  const created = (await db.orm.public.Folder.create({
    id: crypto.randomUUID(),
    name,
    icon: input.folderIcon ?? (name === IMPORT_FOLDER ? '📥' : '📚'),
    userId,
  })) as Row;
  return String(created.id);
}

async function ownedDocument(db: Db, userId: string, id: string, message: string): Promise<Row> {
  const row = (await db.orm.public.Document.first({ id })) as Row | null;
  if (!row || row.userId !== userId || row.isDeleted) {
    throw new ImportError('not_found', message);
  }
  return row;
}

// 父链上撞回自己就是环：DocumentTree 从 parentId === null 开始渲染，写出环等于把这篇
// 连同子树藏到导航之外，所以写之前就拒。
async function assertNoCycle(
  db: Db,
  documentId: string,
  parentId: string,
  proposed: Map<string, string>,
): Promise<void> {
  if (documentId === parentId) {
    throw new ImportError('invalid_parent', '父文档不能是文档自己');
  }
  const seen = new Set<string>();
  let cursor: string | null = parentId;
  while (cursor) {
    if (cursor === documentId) {
      throw new ImportError('invalid_parent', '父文档不能是这篇文档的子页面');
    }
    if (seen.has(cursor)) return;
    seen.add(cursor);
    const next = proposed.get(cursor);
    if (next) {
      cursor = next;
      continue;
    }
    const row = (await db.orm.public.Document.first({ id: cursor })) as Row | null;
    cursor = row && typeof row.parentId === 'string' ? row.parentId : null;
  }
}

// 先整批校验、再逐篇写：接口承诺「全量成败」，后一篇引用不存在或他人的 id 时，前面
// 几篇不能已经落库——否则客户端重试会把它们再建一遍。
async function precheck(db: Db, userId: string, files: MarkdownFile[]): Promise<void> {
  for (const file of files) {
    if (file.documentId) {
      await ownedDocument(db, userId, file.documentId, '目标文档不存在或已删除');
    }
    if (file.parentDocumentId) {
      await ownedDocument(db, userId, file.parentDocumentId, '父文档不存在或已删除');
    }
  }

  // 同批可以一边把 A 挂到 B、一边把 B 挂到 A：逐篇对着「库里现状」查环看不见对方还没写
  // 的改动，所以先把这批建议的父级叠进图里，再走一遍父链。
  const proposed = new Map<string, string>();
  for (const file of files) {
    if (file.documentId && file.parentDocumentId) {
      proposed.set(file.documentId, file.parentDocumentId);
    }
  }
  for (const [documentId, parentId] of proposed) {
    await assertNoCycle(db, documentId, parentId, proposed);
  }
}

async function writeDocument(
  db: Db,
  userId: string,
  file: MarkdownFile,
  folderId: string | null,
): Promise<ImportedDocument> {
  const text = file.text.trim();
  if (!text) throw new ImportError('empty', '没有可导入的内容');
  if (text.length > MAX_IMPORT_CHARS) {
    throw new ImportError('too_large', `《${file.name}》超过 ${MAX_IMPORT_CHARS} 字符上限`);
  }

  const { content, icon } = parseMarkdownWithIcon(file.text);
  const title = (
    file.name.replace(/\.(markdown|md|txt)$/i, '').trim() || titleFromMarkdown(file.text)
  ).slice(0, 80);

  let parentId: string | null = null;
  if (file.parentDocumentId) {
    const parent = (await db.orm.public.Document.first({ id: file.parentDocumentId })) as Row | null;
    if (!parent || parent.userId !== userId || parent.isDeleted) {
      throw new ImportError('not_found', '父文档不存在或已删除');
    }
    parentId = String(parent.id);
  }

  // No DB default on metaUpdatedAt; without it the row never enters the
  // incremental-sync stream (document tsCol is metaUpdatedAt).
  const metaUpdatedAt = new Date().toISOString();
  const payload: Record<string, unknown> = {
    title,
    content,
    plainText: serializeDocument(content, 'text'),
    icon,
    metaUpdatedAt,
  };
  if (parentId) {
    // 挂了父文档就不再占文件夹：移动界面里两者互斥，而文件夹页按 folderId 列表，
    // 留着会把子页面也当文件夹文档列出来。
    payload.parentId = parentId;
    payload.folderId = null;
  }

  if (file.documentId) {
    const existing = (await db.orm.public.Document.first({ id: file.documentId })) as Row | null;
    if (!existing || existing.userId !== userId || existing.isDeleted) {
      throw new ImportError('not_found', '目标文档不存在或已删除');
    }
    await db.orm.public.Document.where({ id: file.documentId }).update(payload);
    return { id: file.documentId, title, created: false };
  }

  const created = (await db.orm.public.Document.create({
    id: crypto.randomUUID(),
    userId,
    folderId: folderId ?? null,
    ...payload,
  })) as Row;
  return { id: String(created.id), title, created: true };
}

export async function importMarkdownForUser(
  userId: string,
  input: {
    files: MarkdownFile[];
    folderId?: string | null;
    folderName?: string | null;
    folderIcon?: string;
  },
): Promise<ImportedDocument[]> {
  const files = input.files.filter((file) => file.text?.trim()).slice(0, MAX_IMPORT_FILES);
  if (!files.length) throw new ImportError('empty', '没有可导入的内容');

  const db = await getDb();
  const run = async (handle: Db): Promise<ImportedDocument[]> => {
    await precheck(handle, userId, files);

    // 纯更新、以及挂了父文档的都不碰文件夹：否则一次纯更新也会凭空多出一个
    // 「Imported Notes」。
    const needsFolder = files.some((file) => !file.documentId && !file.parentDocumentId);
    const folderId = needsFolder ? await resolveFolder(handle, userId, input) : null;

    const written: ImportedDocument[] = [];
    for (const file of files) {
      written.push(await writeDocument(handle, userId, file, folderId));
    }

    // 整批合并为一次广播（文件夹可能同批新建）
    await emitSyncEventSafe(handle, userId, ['document'], written[written.length - 1]!.id);
    return written;
  };

  // 有 transaction 就整批一个事务（写到一半异常时回滚）；模拟 db 或旧版 ORM 没有就直接跑。
  return typeof db.transaction === 'function' ? db.transaction(run) : run(db);
}
