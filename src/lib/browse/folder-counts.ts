/**
 * Folder document counts (G47): a folder shows how many documents it holds, and that number
 * includes everything inside its subfolders, because the sidebar nests folders but the badge is
 * meant to answer "how much is in here".
 */
export interface CountableFolder {
  id: string;
  parentId: string | null;
}

export interface CountableDocument {
  folderId: string | null;
  /** A non-null parent means the document is a subpage of another document, not a folder entry. */
  parentId: string | null;
}

export function folderDocumentCounts(
  folders: readonly CountableFolder[],
  documents: readonly CountableDocument[],
): Map<string, number> {
  const childFolderIds = new Map<string, string[]>();
  for (const folder of folders) {
    if (folder.parentId === null) continue;
    const siblings = childFolderIds.get(folder.parentId);
    if (siblings) siblings.push(folder.id);
    else childFolderIds.set(folder.parentId, [folder.id]);
  }

  const directCounts = new Map<string, number>();
  for (const document of documents) {
    if (document.folderId === null || document.parentId !== null) continue;
    directCounts.set(document.folderId, (directCounts.get(document.folderId) ?? 0) + 1);
  }

  const totals = new Map<string, number>();
  const resolving = new Set<string>();

  const resolve = (id: string): number => {
    const cached = totals.get(id);
    if (cached !== undefined) return cached;
    // 环守卫：脏数据里父子互为祖先时返回 0，而不是无限递归
    if (resolving.has(id)) return 0;
    resolving.add(id);
    let total = directCounts.get(id) ?? 0;
    for (const childId of childFolderIds.get(id) ?? []) total += resolve(childId);
    resolving.delete(id);
    totals.set(id, total);
    return total;
  };

  for (const folder of folders) resolve(folder.id);
  return totals;
}
