import { existsSync, readFileSync } from 'node:fs';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

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

function blocksOf(node: ContentNode | undefined, out: string[] = []): string[] {
  if (!node) return out;
  switch (node.type) {
    case 'doc':
      (node.content ?? []).forEach((child) => blocksOf(child, out));
      break;
    case 'heading':
    case 'paragraph':
    case 'blockquote':
    case 'codeBlock':
      if (textOf(node).trim()) out.push(textOf(node).trim());
      break;
    case 'listItem':
    case 'taskItem':
      (node.content ?? []).forEach((child) => blocksOf(child, out));
      break;
    case 'bulletList':
    case 'orderedList':
    case 'taskList':
    case 'table':
      (node.content ?? []).forEach((child) => blocksOf(child, out));
      break;
    default:
      (node.content ?? []).forEach((child) => blocksOf(child, out));
      if (!node.content && textOf(node).trim()) out.push(textOf(node).trim());
  }
  return out;
}

function fontPath(): string | null {
  const candidates = [
    process.env['CRAFTY_PDF_FONT'],
    process.platform === 'win32' ? 'C:\\Windows\\Fonts\\simhei.ttf' : null,
  ].filter((value): value is string => Boolean(value));
  return candidates.find((path) => existsSync(path)) ?? null;
}

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    const next = current + char;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/** G22: a plain PDF projection with a system CJK font when one is available. */
export async function pdfFromContent(title: string, content: unknown): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const custom = fontPath();
  const textBlocks = [
    ...(title.trim() ? [title.trim()] : []),
    ...blocksOf((content ?? {}) as ContentNode),
  ];
  const hasNonLatin = textBlocks.some((line) => /[^\u0000-\u00ff]/.test(line));
  if (!custom && hasNonLatin) {
    throw new Error('PDF 导出缺少中文字体（可设置 CRAFTY_PDF_FONT）');
  }
  const font = custom
    ? await pdf.embedFont(readFileSync(custom), { subset: true })
    : await pdf.embedFont(StandardFonts.Helvetica);

  const size = 12;
  const lineHeight = 18;
  const margin = 50;
  const pageWidth = 595;
  const pageHeight = 842;
  const maxWidth = pageWidth - margin * 2;
  const lines = textBlocks.flatMap((line) => wrapLine(line, font, size, maxWidth));

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  for (const line of lines) {
    if (y < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(line, { x: margin, y, size, font, color: rgb(0.1, 0.1, 0.1) });
    y -= lineHeight;
  }
  return Buffer.from(await pdf.save());
}
