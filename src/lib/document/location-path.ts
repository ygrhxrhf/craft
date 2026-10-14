import { UNSORTED_TITLE } from '@/lib/browse/official-copy';
import { UNTITLED_FOLDER, untitledFor } from './untitled-copy';

/**
 * The 「位置」 section (G203). The info panel renders the current document's ancestry as a
 * breadcrumb — an emoji and the ancestor's name, joined by ` / `. The chain runs from the root
 * down to the document's parent; the document itself is not part of its own location.
 *
 * A document with no ancestors is not location-less: the collected screen shows the folder it
 * belongs to, and 「未分类」 when it belongs to none (G215, G359).
 */
export interface PathNode {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  folderId?: string | null;
}

export interface FolderNode {
  id: string;
  name: string;
  icon: string | null;
}

export const LOCATION_TITLE = '位置';
export const PATH_SEPARATOR = ' / ';

/**
 * Walk up from `documentId` through `parentId` links, returning the ancestors root-first. A cycle
 * or a missing parent stops the walk rather than looping; a document with no parent yields an
 * empty chain.
 */
export function ancestryPath(nodes: readonly PathNode[], documentId: string): PathNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const chain: PathNode[] = [];
  const seen = new Set<string>([documentId]);
  let current = byId.get(documentId)?.parentId ?? null;
  while (current) {
    if (seen.has(current)) break; // a cycle: stop rather than loop forever
    seen.add(current);
    const node = byId.get(current);
    if (!node) break; // dangling parent: stop
    chain.push(node);
    current = node.parentId;
  }
  return chain.reverse();
}

/** One node's label: its emoji when it has one, then its name. */
export function pathLabel(node: PathNode): string {
  const name = node.title || untitledFor('list');
  return node.icon ? `${node.icon} ${name}` : name;
}

/** One folder's label: its emoji when it has one, then its name. */
export function folderLabel(folder: FolderNode): string {
  const name = folder.name || UNTITLED_FOLDER;
  return folder.icon ? `${folder.icon} ${name}` : name;
}

/**
 * The whole breadcrumb. An ancestor chain wins; otherwise the folder the document sits in;
 * otherwise 「未分类」, which is where every unfiled document lives.
 */
export function locationPathLabel(
  nodes: readonly PathNode[],
  documentId: string,
  folders: readonly FolderNode[] = [],
): string {
  const chain = ancestryPath(nodes, documentId);
  if (chain.length) return chain.map(pathLabel).join(PATH_SEPARATOR);
  const folderId = nodes.find((node) => node.id === documentId)?.folderId ?? null;
  const folder = folderId ? folders.find((f) => f.id === folderId) : undefined;
  return folder ? folderLabel(folder) : UNSORTED_TITLE;
}
