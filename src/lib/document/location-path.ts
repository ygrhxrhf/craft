/**
 * The 「位置」 section (G203). The info panel renders the current document's ancestry as a
 * breadcrumb — an emoji and the ancestor's name, joined by ` / `. The chain runs from the root
 * down to the document's parent; the document itself is not part of its own location.
 */
export interface PathNode {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
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
  const name = node.title || '无标题';
  return node.icon ? `${node.icon} ${name}` : name;
}

/** The whole breadcrumb, or an empty string when the document sits at the root. */
export function locationPathLabel(nodes: readonly PathNode[], documentId: string): string {
  return ancestryPath(nodes, documentId).map(pathLabel).join(PATH_SEPARATOR);
}
