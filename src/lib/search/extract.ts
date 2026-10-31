import { blockChildCount, isPageNode } from '@/lib/document/page-tree';

export interface ExtractedBlock {
  index: number;
  text: string;
  type: string;
  /** G53: the same `isPage`/`children` projection export and AI read. */
  isPage: boolean;
  children: number;
}

function nodeText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (Array.isArray(node.content)) {
    return node.content.map(nodeText).join('');
  }
  // Atom nodes keep their label in an attribute, so a mention or a whiteboard link
  // stays findable by the text it shows on screen.
  return node.attrs?.title ?? node.attrs?.name ?? '';
}

export function pmNodeText(node: any): string {
  return nodeText(node).replace(/\s+/g, ' ').trim();
}

export function extractBlocks(content: unknown): ExtractedBlock[] {
  const blocks: ExtractedBlock[] = [];
  if (!content || typeof content !== 'object') return blocks;

  const doc = content as { content?: any[] };
  const children = Array.isArray(doc.content) ? doc.content : [];

  children.forEach((node, index) => {
    const text = nodeText(node).replace(/\s+/g, ' ').trim();
    if (text) {
      blocks.push({
        index,
        text,
        type: node.type ?? 'paragraph',
        isPage: isPageNode(node),
        children: blockChildCount(node),
      });
    }
  });

  return blocks;
}
