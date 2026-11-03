'use server';

import { assertOwned, requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { parseMarkdownWithIcon, titleFromMarkdown } from '@/lib/import/markdown';
import { htmlToMarkdown, parseArchiveZip, parseEnex, parseReadwiseCsv } from '@/lib/import/sources';
import { serializeDocument } from '@/lib/document-codec';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

const MAX_FILES = 20;
const MAX_CHARS = 500_000;
const IMPORT_FOLDER = 'Imported Notes';

export interface MarkdownFile {
  name: string;
  text: string;
}

export interface ImportedDocument {
  id: string;
  title: string;
}

/**
 * Brings Markdown files (or a Text Bundle's `text.md`) in as real documents.
 * Without a folder chosen they land in a single "Imported Notes" folder, which
 * keeps a bulk import from scattering across the sidebar.
 */
export async function importMarkdownDocuments(input: {
  files: MarkdownFile[];
  folderId?: string | null;
}): Promise<ImportedDocument[]> {
  const userId = await requireUserId();
  const files = input.files.filter((file) => file.text.trim()).slice(0, MAX_FILES);
  if (!files.length) throw new Error('没有可导入的内容');
  if (files.some((file) => file.text.length > MAX_CHARS)) throw new Error('单个文件过大');

  const db = await getDb();
  let folderId = input.folderId ?? null;
  if (folderId) {
    await assertOwned('Folder', folderId, userId, '目标文件夹不存在');
  } else {
    const folders = await db.orm.public.Folder.where({ userId }).all();
    const existing = folders.find((folder: any) => folder.name === IMPORT_FOLDER && !folder.isDeleted);
    folderId = existing
      ? (existing as any).id
      : (
          await db.orm.public.Folder.create({
            id: crypto.randomUUID(),
            name: IMPORT_FOLDER,
            icon: '📥',
            userId,
          })
        ).id;
  }

  const created: ImportedDocument[] = [];
  for (const file of files) {
    const { content, icon } = parseMarkdownWithIcon(file.text);
    const title = file.name.replace(/\.(markdown|md|txt)$/i, '').trim() || titleFromMarkdown(file.text);
    const document = await db.orm.public.Document.create({
      id: crypto.randomUUID(),
      title: title.slice(0, 80),
      userId,
      folderId,
      icon,
      content,
      plainText: serializeDocument(content, 'text'),
      // No DB default on metaUpdatedAt; without it new rows never enter the
      // incremental-sync stream (document tsCol is metaUpdatedAt).
      metaUpdatedAt: new Date().toISOString(),
    });
    created.push({ id: (document as any).id, title: (document as any).title });
  }

  // 整批导入合并为一次广播（文件夹可能同批新建）
  await emitSyncEventSafe(db, userId,
    created.length ? ['document'] : ['folder'],
    created[created.length - 1]?.id ?? folderId);
  return created;
}

export interface SourceImportFile {
  name: string;
  /** Text for md/html/enex/csv; base64 for zip archives. */
  text: string;
}

/** G22: the five import sources all collapse to Markdown files before the same create path. */
export async function importSourceFiles(input: {
  files: SourceImportFile[];
  folderId?: string | null;
}): Promise<ImportedDocument[]> {
  const markdown: MarkdownFile[] = [];
  for (const file of input.files) {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.zip')) {
      markdown.push(...(await parseArchiveZip(file.text)));
    } else if (lower.endsWith('.enex')) {
      markdown.push(...parseEnex(file.text));
    } else if (lower.endsWith('.csv')) {
      markdown.push(...parseReadwiseCsv(file.text));
    } else if (/\.html?$/i.test(lower)) {
      const text = htmlToMarkdown(file.text);
      if (text) markdown.push({ name: file.name.replace(/\.html?$/i, '.md'), text });
    } else {
      markdown.push(file);
    }
  }
  return importMarkdownDocuments({ files: markdown, folderId: input.folderId });
}
