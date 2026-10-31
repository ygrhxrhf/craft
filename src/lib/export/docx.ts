import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

interface ContentNode {
  type?: string;
  attrs?: Record<string, unknown>;
  text?: string;
  content?: ContentNode[];
}

function textOf(node: ContentNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(textOf).join('');
}

const HEADINGS: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

function paragraphsFor(node: ContentNode, level = 0): Paragraph[] {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).flatMap((child) => paragraphsFor(child, level));
    case 'heading': {
      const depth = Number(node.attrs?.level ?? 1);
      return [new Paragraph({ text: textOf(node), heading: HEADINGS[depth] ?? HEADINGS[1] })];
    }
    case 'paragraph':
    case 'blockquote':
      return [new Paragraph({ text: textOf(node) })];
    case 'codeBlock':
      return [new Paragraph({
        children: [new TextRun({ text: textOf(node), font: 'Courier New' })],
      })];
    case 'bulletList':
    case 'orderedList':
    case 'taskList':
      return (node.content ?? []).flatMap((item) => (
        (item.content ?? []).length > 0
          ? paragraphsFor(item, level + 1)
          : [new Paragraph({ text: textOf(item), bullet: { level } })]
      ));
    case 'listItem':
    case 'taskItem':
      return (node.content ?? []).flatMap((child) => paragraphsFor(child, level));
    case 'table':
      return (node.content ?? []).flatMap((row) => (
        (row.content ?? []).map((cell) => new Paragraph({ text: textOf(cell) }))
      ));
    default:
      return textOf(node).trim() ? [new Paragraph({ text: textOf(node) })] : [];
  }
}

/** G22: a minimal DOCX projection; unsupported block chrome degrades to its text. */
export async function docxFromContent(title: string, content: unknown): Promise<Buffer> {
  const root = (content ?? {}) as ContentNode;
  const children = [
    ...(title.trim() ? [new Paragraph({ text: title.trim(), heading: HeadingLevel.TITLE })] : []),
    ...paragraphsFor(root),
  ];
  const document = new Document({ sections: [{ children }] });
  return Packer.toBuffer(document);
}
