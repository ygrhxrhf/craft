import { blockChildCount, isPageNode } from '@/lib/document/page-tree';

export interface BlockSummary {
  index: number;
  type: string;
  text: string;
  /** G53: whether this top-level block is a page (page style or has children). */
  isPage: boolean;
  /** G53: direct child-block count, the official `children` figure. */
  children: number;
}

interface ContentNode {
  type?: string;
  text?: string;
  content?: ContentNode[];
}

function textOf(node: ContentNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(textOf).join('');
}

/**
 * G49 `blocks_get`: a flat, ordered view of the document's top-level blocks.
 * G53: the same projection carries `isPage`/`children`, so the AI reader sees the
 * block tree the way export and search do instead of a text-only list.
 */
export function listBlocks(content: unknown): BlockSummary[] {
  const root = content as ContentNode | null;
  return (root?.content ?? []).map((node, index) => ({
    index,
    type: node.type ?? 'unknown',
    text: textOf(node),
    isPage: isPageNode(node),
    children: blockChildCount(node),
  }));
}

/** G49 `insert_text`: append one paragraph without touching the rest of the tree. */
export function appendTextBlock(content: unknown, text: string): Record<string, unknown> {
  const root = (content ?? {}) as ContentNode;
  const blocks = Array.isArray(root.content) ? root.content : [];
  return {
    ...root,
    type: root.type ?? 'doc',
    content: [
      ...blocks,
      { type: 'paragraph', content: [{ type: 'text', text }] },
    ],
  };
}
