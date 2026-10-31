import { serializeDocument } from '@/lib/document-codec';

export interface PageRow {
  id: string;
  title: string;
  parentId?: string | null;
  content?: unknown;
}

export interface PageNode {
  id: string;
  title: string;
  content: unknown;
  children: PageNode[];
}

/**
 * G53: the projection layer. The stored model is still `Document + parentId`,
 * so this builds the block-tree view callers need without migrating the schema:
 * a page is a node with children, and its subtree has one markdown projection.
 */
export function buildPageTree(rows: readonly PageRow[], rootId: string): PageNode | null {
  const byParent = new Map<string, PageRow[]>();
  for (const row of rows) {
    const key = row.parentId ?? '';
    const list = byParent.get(key) ?? [];
    list.push(row);
    byParent.set(key, list);
  }
  const root = rows.find((row) => row.id === rootId);
  if (!root) return null;

  const visit = (row: PageRow, seen: Set<string>): PageNode => {
    if (seen.has(row.id)) return { id: row.id, title: row.title, content: row.content, children: [] };
    const nextSeen = new Set(seen).add(row.id);
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      children: (byParent.get(row.id) ?? []).map((child) => visit(child, nextSeen)),
    };
  };
  return visit(root, new Set());
}

/** The official `pageContent`: this page's markdown plus every child page as a section. */
export function pageContentMarkdown(node: PageNode): string {
  const own = serializeDocument(node.content ?? { type: 'doc', content: [] }, 'markdown').trim();
  if (node.children.length === 0) return own;
  const childSections = node.children.map((child) => {
    const body = pageContentMarkdown(child);
    return `## ${child.title}${body ? `\n\n${body}` : ''}`;
  });
  return [own, ...childSections].filter(Boolean).join('\n\n');
}

export function childCount(node: PageNode): number {
  return node.children.length;
}

interface BlockNode {
  type?: string;
  attrs?: { textStyle?: string | null };
  content?: BlockNode[];
}

/**
 * G53: the official `isPage` predicate. A block is a page when it carries a page
 * text style (PageRegular / PageCard) **or** has children — the two conditions the
 * capture records, not "has children" alone (an empty styled page is still a page).
 */
export function isPageNode(node: unknown): boolean {
  const block = node as BlockNode | null;
  if (!block || typeof block !== 'object') return false;
  const style = block.attrs?.textStyle;
  if (style === 'PageRegular' || style === 'PageCard') return true;
  return Array.isArray(block.content) && block.content.length > 0;
}

/** Direct child count of a block node, the `children` figure the block object exposes. */
export function blockChildCount(node: unknown): number {
  const block = node as BlockNode | null;
  return Array.isArray(block?.content) ? block.content.length : 0;
}
