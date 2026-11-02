import { existsSync, readFileSync } from 'node:fs';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import {
  DEFAULT_PDF_EXPORT_OPTIONS,
  PDF_PAPER_SIZES,
  normalizePdfOptions,
  type PdfExportOptions,
} from './pdf-options';

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
export async function pdfFromContent(
  title: string,
  content: unknown,
  optionsInput?: Partial<PdfExportOptions> | null,
): Promise<Buffer> {
  const options = normalizePdfOptions(optionsInput ?? DEFAULT_PDF_EXPORT_OPTIONS);
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
  const portrait = options.paper === 'dynamic' ? PDF_PAPER_SIZES.a4 : PDF_PAPER_SIZES[options.paper];
  const pageWidth = portrait.width;
  const maxWidth = pageWidth - margin * 2;
  const lines = textBlocks.flatMap((line) => wrapLine(line, font, size, maxWidth));

  const ink = options.dark ? rgb(0.9, 0.9, 0.9) : rgb(0.1, 0.1, 0.1);
  const paperColor = options.dark ? rgb(0.07, 0.07, 0.08) : rgb(1, 1, 1);
  const muted = options.dark ? rgb(0.6, 0.6, 0.62) : rgb(0.55, 0.55, 0.55);

  const pages: PDFPage[] = [];
  const newPage = (pageHeight: number) => {
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: paperColor });
    pages.push(page);
    return page;
  };

  if (options.paper === 'dynamic') {
    // G149 动态：一整页，高度随正文增长（不低于 A4）。
    const pageHeight = Math.max(portrait.height, margin * 2 + Math.max(1, lines.length) * lineHeight);
    const page = newPage(pageHeight);
    let y = pageHeight - margin;
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size, font, color: ink });
      y -= lineHeight;
    }
  } else {
    const pageHeight = portrait.height;
    let page = newPage(pageHeight);
    let y = pageHeight - margin;
    for (const line of lines) {
      if (y < margin) {
        page = newPage(pageHeight);
        y = pageHeight - margin;
      }
      page.drawText(line, { x: margin, y, size, font, color: ink });
      y -= lineHeight;
    }
  }

  if (options.watermark && title.trim()) {
    const mark = title.trim().slice(0, 40);
    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText(mark, {
        x: margin,
        y: height / 2,
        size: 48,
        font,
        color: muted,
        opacity: 0.08,
        rotate: degrees(35),
      });
    }
  }

  if (options.pageNumbers) {
    pages.forEach((page, index) => {
      const { width } = page.getSize();
      const label = `${index + 1} / ${pages.length}`;
      const textWidth = font.widthOfTextAtSize(label, 9);
      page.drawText(label, {
        x: (width - textWidth) / 2,
        y: margin / 2,
        size: 9,
        font,
        color: muted,
      });
    });
  }

  return Buffer.from(await pdf.save());
}
