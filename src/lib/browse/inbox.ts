/**
 * The unsorted collection (`/inbox`, G45): documents that belong to no folder and are not a page
 * inside another document. Daily notes are excluded — they live in their own section.
 */
import { compareFolderOrder } from '@/lib/folder/order';

export interface LocatableDocument {
  id: string;
  parentId: string | null;
  folderId: string | null;
  isDeleted: boolean;
  isDailyNote: boolean;
  order: number;
}

export function unsortedDocuments<T extends LocatableDocument>(documents: readonly T[]): T[] {
  return documents
    .filter((d) => !d.isDeleted && !d.isDailyNote && d.folderId === null && d.parentId === null)
    .sort((a, b) => a.order - b.order);
}

export interface FolderLike {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  isDeleted: boolean;
  createdAt?: string | null;
}

export interface FolderOption {
  id: string;
  name: string;
  /** 0 for a top-level folder; deeper folders are indented under their parent. */
  depth: number;
}

/** The archive targets, in sidebar order and depth-first, so the menu mirrors the folder tree. */
export function folderOptions(folders: readonly FolderLike[]): FolderOption[] {
  const live = folders.filter((f) => !f.isDeleted);
  const byParent = new Map<string, FolderLike[]>();
  const roots: FolderLike[] = [];
  for (const folder of live) {
    if (folder.parentId === null) {
      roots.push(folder);
      continue;
    }
    const siblings = byParent.get(folder.parentId);
    if (siblings) siblings.push(folder);
    else byParent.set(folder.parentId, [folder]);
  }
  const byOrder = compareFolderOrder;
  roots.sort(byOrder);
  for (const siblings of byParent.values()) siblings.sort(byOrder);

  const options: FolderOption[] = [];
  const seen = new Set<string>();
  const walk = (folder: FolderLike, depth: number) => {
    if (seen.has(folder.id)) return; // a cycle in the folder tree must not loop the menu
    seen.add(folder.id);
    options.push({ id: folder.id, name: folder.name, depth });
    for (const child of byParent.get(folder.id) ?? []) walk(child, depth + 1);
  };
  for (const root of roots) walk(root, 0);
  // Orphaned rows (a parent that was deleted or is missing) still deserve a place to be filed.
  for (const folder of live) {
    if (!seen.has(folder.id)) options.push({ id: folder.id, name: folder.name, depth: 0 });
  }
  return options;
}
