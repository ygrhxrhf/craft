/**
 * G216：文档卡片预览图的渲染内核（官方由 `res.craft.do/render/document_preview/v1/…`
 * 的后端渲染服务出图，尺寸 `size` 与主题 `theming` 都是参数）。
 *
 * 本地对应面：把 `Document.content`（ProseMirror JSON 镜像）**确定性**地渲成一张 SVG——
 * 标题行＋首屏若干块的文本/结构近似（段落、标题、列表、引用、代码、分隔线、媒体占位）。
 * 纯函数、无 DOM、无头浏览器：同样的输入永远出同样的字节，可单测。
 * 载体差异：官方是位图快照，本地是 SVG 重绘（卡片 `<img>` 直接吃，浏览器原生渲染）。
 */

export type PreviewSize = 's' | 'm' | 'l';
export type PreviewTheme = 'light' | 'dark';

export interface PreviewInput {
  title: string;
  icon?: string | null;
  /** `Document.content`；既接受 `{content: PmNode[]}` 也接受块数组本身。 */
  content?: unknown;
}

export const PREVIEW_SIZE_DIMS: Record<PreviewSize, { width: number; height: number }> = {
  s: { width: 240, height: 150 },
  m: { width: 320, height: 200 },
  l: { width: 480, height: 300 },
};

const PALETTES: Record<PreviewTheme, Record<'bg' | 'title' | 'text' | 'faint' | 'rule' | 'fill', string>> = {
  light: { bg: '#ffffff', title: '#1d1d1f', text: '#4a4a4f', faint: '#9a9aa0', rule: '#e7e7ea', fill: '#f2f2f4' },
  dark: { bg: '#1e1e20', title: '#f5f5f7', text: '#b9b9bf', faint: '#77777d', rule: '#333336', fill: '#2a2a2d' },
};

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "'Cascadia Mono', Consolas, monospace";

interface PmNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  text?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 宽字符（CJK/全角）按 1em 估宽，其余按 0.55em——只是为了换行稳定，不追求排版精度。 */
const WIDE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/;

function measure(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) width += (WIDE.test(char) ? 1 : 0.55) * fontSize;
  return width;
}

function wrap(text: string, maxWidth: number, fontSize: number): { lines: string[]; truncated: boolean } {
  const lines: string[] = [];
  let current = '';
  let truncated = false;
  for (const char of text) {
    const next = current + char;
    if (current && measure(next, fontSize) > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
    if (lines.length > 40) {
      truncated = true;
      break;
    }
  }
  if (current) lines.push(current);
  return { lines, truncated };
}

function inlineText(node: PmNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (Array.isArray(node.content)) return node.content.map(inlineText).join('');
  const label = node.attrs?.title ?? node.attrs?.name;
  return typeof label === 'string' ? label : '';
}

const MEDIA_LABEL: Record<string, string> = {
  image: '图片',
  imageBlock: '图片',
  whiteboardEmbed: '白板',
  collectionBlock: '集合',
  pageBlock: '页面',
  videoEmbed: '视频',
  audio: '音频',
  htmlEmbed: '嵌入',
  webEmbed: '网页',
  drawing: '绘图',
  fileAttachment: '文件',
};

export function renderDocumentPreview(input: PreviewInput, options?: { size?: PreviewSize; theme?: PreviewTheme }): string {
  const size = options?.size ?? 'm';
  const theme = options?.theme ?? 'light';
  const { width, height } = PREVIEW_SIZE_DIMS[size];
  const palette = PALETTES[theme];
  const pad = 14;
  const innerWidth = width - pad * 2;
  const parts: string[] = [];
  let y = pad;

  const pushText = (x: number, baseline: number, text: string, fontSize: number, fill: string, weight = 400, family = FONT) => {
    parts.push(
      `<text x="${x}" y="${baseline}" font-family="${family}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${escapeXml(text)}</text>`,
    );
  };

  const lineHeight = 12;
  const bottom = height - pad + 4;

  // 标题行（带图标）。
  const iconPrefix = input.icon ? `${input.icon} ` : '';
  const titleText = `${iconPrefix}${input.title?.trim() || '无标题文档'}`;
  const titleWrap = wrap(titleText, innerWidth, 13);
  pushText(pad, y + 12, titleWrap.lines[0] ?? '', 13, palette.title, 650);
  y += 22;

  const blocks = Array.isArray(input.content)
    ? (input.content as PmNode[])
    : Array.isArray((input.content as { content?: PmNode[] } | undefined)?.content)
      ? (input.content as { content: PmNode[] }).content
      : [];

  const drawParagraph = (text: string, fontSize: number, indent: number, fill: string, weight = 400) => {
    if (!text.trim()) return;
    const wrapped = wrap(text, innerWidth - indent, fontSize);
    for (let index = 0; index < wrapped.lines.length && y + lineHeight <= bottom; index += 1) {
      const isLastDrawn = y + lineHeight * 2 > bottom;
      const suffix = isLastDrawn && (wrapped.truncated || index < wrapped.lines.length - 1) ? '…' : '';
      pushText(pad + indent, y + fontSize, wrapped.lines[index] + suffix, fontSize, fill, weight);
      y += lineHeight;
    }
    y += 2;
  };

  const drawMedia = (label: string) => {
    if (y + 22 > bottom) return;
    parts.push(`<rect x="${pad}" y="${y}" width="${innerWidth}" height="20" rx="4" fill="${palette.fill}"/>`);
    pushText(pad + 8, y + 14, label, 9, palette.faint);
    y += 26;
  };

  const visit = (node: PmNode, indent: number) => {
    if (y > bottom) return;
    switch (node.type) {
      case 'paragraph':
        drawParagraph(inlineText(node), 9.5, indent, palette.text);
        break;
      case 'heading': {
        const level = Number(node.attrs?.level ?? 3);
        drawParagraph(inlineText(node), Math.max(9.5, 13 - level), indent, palette.title, 600);
        break;
      }
      case 'bulletList':
      case 'orderedList':
      case 'taskList':
        (node.content ?? []).forEach((item, index) => {
          const marker =
            node.type === 'bulletList' ? '• ' : node.type === 'orderedList' ? `${index + 1}. ` : item.attrs?.checked === true ? '☑ ' : '☐ ';
          const itemNode = item.content?.[0];
          drawParagraph(`${marker}${inlineText(itemNode)}`, 9.5, indent + 2, palette.text);
        });
        break;
      case 'blockquote':
      case 'callout':
      case 'toggleBlock':
        parts.push(`<rect x="${pad + indent}" y="${y}" width="2" height="10" rx="1" fill="${palette.rule}"/>`);
        (node.content ?? []).forEach((child) => visit(child, indent + 8));
        break;
      case 'codeBlock': {
        const code = inlineText(node).split(/\r?\n/).slice(0, 4);
        const boxHeight = code.length * 10 + 8;
        if (y + boxHeight > bottom) return;
        parts.push(`<rect x="${pad}" y="${y}" width="${innerWidth}" height="${boxHeight}" rx="4" fill="${palette.fill}"/>`);
        code.forEach((line, index) => {
          pushText(pad + 6, y + 11 + index * 10, line.slice(0, 60), 8.5, palette.text, 400, MONO);
        });
        y += boxHeight + 4;
        break;
      }
      case 'divider':
        if (y + 8 > bottom) return;
        parts.push(`<line x1="${pad}" y1="${y + 4}" x2="${width - pad}" y2="${y + 4}" stroke="${palette.rule}"/>`);
        y += 12;
        break;
      default:
        if (MEDIA_LABEL[node.type ?? '']) drawMedia(MEDIA_LABEL[node.type ?? '']);
        else if (Array.isArray(node.content) && node.content.length) node.content.forEach((child) => visit(child, indent));
        else drawParagraph(inlineText(node), 9.5, indent, palette.text);
        break;
    }
  };

  for (const block of blocks) {
    if (y > bottom) break;
    visit(block, 0);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><rect width="${width}" height="${height}" fill="${palette.bg}"/>${parts.join('')}</svg>`;
}