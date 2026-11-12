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

/**
 * 画布是**页面比例**（A4 竖版 ≈ 1:1.414），不是横版缩略图。卡片预览槽是竖版、图按
 * `object-cover object-top` 铺满 ⇒ 横版画布会被放大 ~1.4 倍再左右裁掉，标题只剩末尾一个字
 * （第 533 批真面核验抓到的既存缺陷）。竖版画布则是"露出页面顶端、底部被卡片裁掉"，与官方
 * 预览盒溢出裁切同形。SVG 是矢量，尺寸只决定排版坐标系，不影响清晰度。
 */
export const PREVIEW_SIZE_DIMS: Record<PreviewSize, { width: number; height: number }> = {
  s: { width: 240, height: 340 },
  m: { width: 320, height: 452 },
  l: { width: 480, height: 679 },
};

const PALETTES: Record<PreviewTheme, Record<'bg' | 'title' | 'text' | 'faint' | 'rule' | 'fill', string>> = {
  light: { bg: '#ffffff', title: '#1d1d1f', text: '#4a4a4f', faint: '#9a9aa0', rule: '#e7e7ea', fill: '#f2f2f4' },
  dark: { bg: '#1e1e20', title: '#f5f5f7', text: '#b9b9bf', faint: '#77777d', rule: '#333336', fill: '#2a2a2d' },
};

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "'Cascadia Mono', Consolas, monospace";

interface PmMark {
  type?: string;
  attrs?: Record<string, unknown>;
}

interface PmNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  text?: string;
  marks?: PmMark[];
}

interface TextRun {
  text: string;
  /** G250：正文里的彩色文本（`textStyle` 的 `color`）保留配色。 */
  color?: string;
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

/** 彩色 run 的换行：逐字累计，保留每个字属于哪一段颜色。 */
function wrapRuns(runs: TextRun[], maxWidth: number, fontSize: number): { lines: TextRun[][]; truncated: boolean } {
  const lines: TextRun[][] = [];
  let line: TextRun[] = [];
  let width = 0;
  let current = '';
  let currentColor: string | undefined;
  let truncated = false;

  const flushSegment = () => {
    if (current) {
      line.push({ text: current, color: currentColor });
      current = '';
    }
  };
  const flushLine = () => {
    flushSegment();
    if (line.length) lines.push(line);
    line = [];
    width = 0;
  };

  outer: for (const run of runs) {
    for (const char of run.text) {
      const charWidth = measure(char, fontSize);
      if (width + charWidth > maxWidth && width > 0) {
        flushLine();
        if (lines.length > 40) {
          truncated = true;
          break outer;
        }
      }
      if (currentColor !== run.color) {
        flushSegment();
        currentColor = run.color;
      }
      current += char;
      width += charWidth;
    }
  }
  flushLine();
  return { lines, truncated };
}

function inlineText(node: PmNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (Array.isArray(node.content)) return node.content.map(inlineText).join('');
  const label = node.attrs?.title ?? node.attrs?.name;
  return typeof label === 'string' ? label : '';
}

function colorOf(node: PmNode): string | undefined {
  const mark = node.marks?.find((candidate) => candidate.type === 'textStyle');
  const color = mark?.attrs?.color;
  return typeof color === 'string' && color ? color : undefined;
}

/** 把一段富文本拆成带颜色的 run；嵌套容器（如列表项）按顺序摊平。 */
function inlineRuns(node: PmNode | undefined): TextRun[] {
  if (!node) return [];
  if (node.type === 'text') {
    const color = colorOf(node);
    return node.text ? [{ text: node.text, color }] : [];
  }
  if (Array.isArray(node.content)) return node.content.flatMap((child) => inlineRuns(child));
  const label = node.attrs?.title ?? node.attrs?.name;
  return typeof label === 'string' ? [{ text: label }] : [];
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

  const drawRuns = (runs: TextRun[], fontSize: number, indent: number, fill: string, weight = 400) => {
    if (!runs.length) return;
    // 没有彩色 run 时走原来的纯文本换行（输出形状不变，既有单测与预览都对得上）。
    if (!runs.some((run) => run.color)) {
      drawParagraph(runs.map((run) => run.text).join(''), fontSize, indent, fill, weight);
      return;
    }
    const wrapped = wrapRuns(runs, innerWidth - indent, fontSize);
    for (let index = 0; index < wrapped.lines.length && y + lineHeight <= bottom; index += 1) {
      const isLastDrawn = y + lineHeight * 2 > bottom;
      const segments = wrapped.lines[index].map((run) => ({ ...run }));
      if (isLastDrawn && (wrapped.truncated || index < wrapped.lines.length - 1) && segments.length) {
        segments[segments.length - 1].text += '…';
      }
      const body = segments
        .map((run) =>
          run.color
            ? `<tspan fill="${escapeXml(run.color)}">${escapeXml(run.text)}</tspan>`
            : escapeXml(run.text),
        )
        .join('');
      parts.push(
        `<text x="${pad + indent}" y="${y + fontSize}" font-family="${FONT}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${body}</text>`,
      );
      y += lineHeight;
    }
    y += 2;
  };

  /** 单元格文字按列宽截断（预览是缩略图，不做多行单元格）。 */
  const fit = (text: string, maxWidth: number, fontSize: number): string => {
    if (measure(text, fontSize) <= maxWidth) return text;
    let out = '';
    for (const char of text) {
      if (measure(out + char + '…', fontSize) > maxWidth) break;
      out += char;
    }
    return `${out}…`;
  };

  // G250：表格连单元格与表头一起画——首行是表头底色，其余按行画文字与横线。
  const drawTable = (node: PmNode) => {
    const rows = (node.content ?? []).map((row) => (row.content ?? []).map((cell) => inlineText(cell)));
    const cols = Math.max(1, ...rows.map((cells) => cells.length));
    const rowHeight = 15;
    const visible = rows.slice(0, 5);
    const tableHeight = visible.length * rowHeight;
    if (!visible.length || y + tableHeight > bottom) {
      drawMedia('表格');
      return;
    }
    const colWidth = innerWidth / cols;
    parts.push(
      `<rect x="${pad}" y="${y}" width="${innerWidth}" height="${tableHeight}" fill="${palette.fill}" fill-opacity="0.5"/>`,
    );
    parts.push(
      `<rect x="${pad}" y="${y}" width="${innerWidth}" height="${rowHeight}" fill="${palette.fill}"/>`,
    );
    visible.forEach((cells, rowIndex) => {
      const top = y + rowIndex * rowHeight;
      cells.forEach((text, colIndex) => {
        if (!text) return;
        pushText(
          pad + colIndex * colWidth + 3,
          top + 11,
          fit(text, colWidth - 6, 8),
          8,
          rowIndex === 0 ? palette.title : palette.text,
          rowIndex === 0 ? 600 : 400,
        );
      });
      parts.push(
        `<line x1="${pad}" y1="${top + rowHeight}" x2="${width - pad}" y2="${top + rowHeight}" stroke="${palette.rule}"/>`,
      );
    });
    for (let col = 1; col < cols; col += 1) {
      const x = pad + col * colWidth;
      parts.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + tableHeight}" stroke="${palette.rule}"/>`);
    }
    y += tableHeight + 4;
  };

  // G250：子集合出缩略图——标题 + 三条行条，代表集合里的记录。
  const drawCollectionThumb = (node: PmNode) => {
    const label = inlineText(node) || (typeof node.attrs?.title === 'string' ? node.attrs.title : '集合');
    const boxHeight = 34;
    if (y + boxHeight > bottom) {
      drawMedia('集合');
      return;
    }
    parts.push(
      `<rect x="${pad}" y="${y}" width="${innerWidth}" height="${boxHeight}" rx="4" fill="${palette.fill}"/>`,
    );
    pushText(pad + 7, y + 12, fit(label, innerWidth - 14, 8.5), 8.5, palette.title, 600);
    for (let row = 0; row < 3; row += 1) {
      parts.push(
        `<rect x="${pad + 7}" y="${y + 16 + row * 5}" width="${Math.max(20, innerWidth - 14)}" height="2.5" rx="1.2" fill="${palette.rule}"/>`,
      );
    }
    y += boxHeight + 4;
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
        drawRuns(inlineRuns(node), 9.5, indent, palette.text);
        break;
      case 'heading': {
        const level = Number(node.attrs?.level ?? 3);
        drawRuns(inlineRuns(node), Math.max(9.5, 13 - level), indent, palette.title, 600);
        break;
      }
      case 'table':
        drawTable(node);
        break;
      case 'collectionBlock':
        drawCollectionThumb(node);
        break;
      case 'bulletList':
      case 'orderedList':
      case 'taskList':
        (node.content ?? []).forEach((item, index) => {
          const marker =
            node.type === 'bulletList' ? '• ' : node.type === 'orderedList' ? `${index + 1}. ` : item.attrs?.checked === true ? '☑ ' : '☐ ';
          const itemNode = item.content?.[0];
          drawRuns([{ text: marker }, ...inlineRuns(itemNode)], 9.5, indent + 2, palette.text);
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