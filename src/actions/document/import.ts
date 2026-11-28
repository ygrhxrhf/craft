'use server';

import { requireUserId } from '@/lib/authz/guard';
import {
  importMarkdownForUser,
  type ImportedDocument,
  type MarkdownFile,
} from '@/lib/import/import-documents';
import { htmlToMarkdown, parseArchiveZip, parseEnex, parseReadwiseCsv } from '@/lib/import/sources';

export type { ImportedDocument, MarkdownFile };

/**
 * Brings Markdown files (or a Text Bundle's `text.md`) in as real documents.
 * Without a folder chosen they land in a single "Imported Notes" folder, which
 * keeps a bulk import from scattering across the sidebar.
 *
 * 写入本身在 `lib/import/import-documents`——MCP 写令牌那条路（xsxz 推送）走同一个函数，
 * 这里只负责把会话换成 `userId`。
 */
export async function importMarkdownDocuments(input: {
  files: MarkdownFile[];
  folderId?: string | null;
}): Promise<ImportedDocument[]> {
  const userId = await requireUserId();
  return importMarkdownForUser(userId, { files: input.files, folderId: input.folderId });
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
