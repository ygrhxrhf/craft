import JSZip from 'jszip';
import { buildPageTree, pageContentMarkdown, type PageRow } from './page-tree';

export interface LibraryRow extends PageRow {
  isDeleted?: boolean;
}

function safeBase(title: string, id: string): string {
  const base = title.replace(/[\\/:*?"<>|]/g, '_').trim() || '无标题';
  return `${base}-${id.slice(0, 8)}`;
}

function safeName(title: string, id: string): string {
  return `${safeBase(title, id)}.md`;
}

/**
 * G53: the library archive is one file per top-level page, each carrying its
 * subpages as sections through `pageContentMarkdown`. Subpages never get their own
 * file, so the archive mirrors the block tree instead of a flat document list.
 */
export function buildLibraryArchive(rows: readonly LibraryRow[]): JSZip {
  const live = rows.filter((row) => row.isDeleted !== true);
  const zip = new JSZip();

  for (const row of live) {
    if (row.parentId) continue;
    const tree = buildPageTree(live, row.id);
    if (!tree) continue;
    zip.file(safeName(tree.title, tree.id), pageContentMarkdown(tree));
  }

  if (Object.keys(zip.files).length === 0) zip.file('README.md', '资料库为空。');
  return zip;
}

/**
 * G223 「导出为 TextBundle」：每个顶层页是一个 `.textbundle` 文件夹（`text.markdown` +
 * `info.json`），子页仍按 Markdown 章节折进父页——与 Markdown 档共用同一棵页面树。
 */
export function buildTextBundleArchive(rows: readonly LibraryRow[]): JSZip {
  const live = rows.filter((row) => row.isDeleted !== true);
  const zip = new JSZip();

  for (const row of live) {
    if (row.parentId) continue;
    const tree = buildPageTree(live, row.id);
    if (!tree) continue;
    const folder = zip.folder(`${safeBase(tree.title, tree.id)}.textbundle`);
    if (!folder) continue;
    folder.file('text.markdown', pageContentMarkdown(tree));
    folder.file('info.json', JSON.stringify({
      version: 2,
      type: 'net.daringfireball.markdown',
      title: tree.title,
      transient: false,
    }));
  }

  if (Object.keys(zip.files).length === 0) zip.file('README.txt', '资料库为空。');
  return zip;
}
