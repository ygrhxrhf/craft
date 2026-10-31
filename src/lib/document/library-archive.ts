import JSZip from 'jszip';
import { buildPageTree, pageContentMarkdown, type PageRow } from './page-tree';

export interface LibraryRow extends PageRow {
  isDeleted?: boolean;
}

function safeName(title: string, id: string): string {
  const base = title.replace(/[\\/:*?"<>|]/g, '_').trim() || '无标题';
  return `${base}-${id.slice(0, 8)}.md`;
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
