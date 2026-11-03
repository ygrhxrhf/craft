import { DEFAULT_DIVIDER_STYLE, DIVIDER_MARKUP_PATTERN, dividerStyleFromMarkup } from '@/lib/editor/divider-styles';
import { hasHeaderContent, isAlignmentRow, mintTableIds, parseCellBlocks, splitRow } from '@/lib/import/table';
import { DEFAULT_HIGHLIGHT_COLOR } from '@/lib/import/inline-html';
import { mathFromLink } from '@/lib/import/inline-runs';

export interface PmNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

const EMPTY_DOC: PmNode = { type: 'doc', content: [{ type: 'paragraph' }] };

/**
 * Craft folds fence-info into the language code it stores. Table and roster are verbatim
 * from its importer (`Xvt` / `Qvt`); `mermaid` is accepted although it has no alias entry.
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  'c': 'cpp',
  'c++': 'cpp',
  'cc': 'cpp',
  'cpp': 'cpp',
  'cxx': 'cpp',
  'h': 'cpp',
  'h++': 'cpp',
  'hh': 'cpp',
  'hpp': 'cpp',
  'hxx': 'cpp',
  'ino': 'cpp',
  'cs': 'cs',
  'css': 'css',
  'dart': 'dart',
  'go': 'go',
  'gradle': 'groovy',
  'groovy': 'groovy',
  'hs': 'haskell',
  'haskell': 'haskell',
  'handlebars': 'html',
  'hbs': 'html',
  'htm': 'html',
  'html': 'html',
  'java': 'java',
  'cjs': 'javascript',
  'js': 'javascript',
  'jsx': 'javascript',
  'mjs': 'javascript',
  'javascript': 'javascript',
  'json': 'json',
  'map': 'json',
  'jl': 'julia',
  'julia': 'julia',
  'kt': 'kotlin',
  'kts': 'kotlin',
  'kotlin': 'kotlin',
  'lua': 'lua',
  'markdown': 'markdown',
  'md': 'markdown',
  'mkd': 'markdown',
  'perl': 'perl',
  'pl': 'perl',
  'pm': 'perl',
  'php': 'php',
  'php3': 'php',
  'php4': 'php',
  'php5': 'php',
  'php7': 'php',
  'phtml': 'php',
  'py': 'python',
  'python': 'python',
  'pyw': 'python',
  'r': 'r',
  'rb': 'ruby',
  'ruby': 'ruby',
  'rs': 'rust',
  'rust': 'rust',
  'scala': 'scala',
  'bash': 'shell',
  'ksh': 'shell',
  'sh': 'shell',
  'shell': 'shell',
  'cql': 'sql',
  'pls': 'sql',
  'sql': 'sql',
  'swift': 'swift',
  'ltx': 'math_formula',
  'tex': 'math_formula',
  'cts': 'typescript',
  'mts': 'typescript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'typescript': 'typescript',
  'svg': 'xml',
  'xml': 'xml',
  'xsd': 'xml',
  'xsl': 'xml',
  'yaml': 'yaml',
  'yml': 'yaml'
};

const LANGUAGE_NAMES = new Set(['ada', 'bash', 'cpp', 'cs', 'css', 'dart', 'dockerfile', 'go', 'groovy', 'haskell', 'html', 'java', 'javascript', 'json', 'julia', 'kotlin', 'lua', 'markdown', 'matlab', 'objectivec', 'perl', 'php', 'prolog', 'plaintext', 'python', 'r', 'ruby', 'rust', 'scala', 'shell', 'sql', 'swift', 'typescript', 'vbnet', 'yaml', 'xml', 'math_formula', 'other', 'docs', 'blocks', 'suggestions']);

const PSEUDO_LANGUAGES = new Set(['mermaid']);

export function normalizeLanguage(info: string): string | null {
  const token = info.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  // An info-less fence stays language-less: Craft's own shape for that case is unmeasured.
  if (!token) return null;
  const alias = LANGUAGE_ALIASES[token];
  if (alias) return alias;
  return PSEUDO_LANGUAGES.has(token) || LANGUAGE_NAMES.has(token) ? token : 'other';
}

/**
 * Craft's importer drops exactly one trailing space from a code block's body: the test is
 * `content.slice(-1)[0] === " "`, so two spaces lose one and one space loses it entirely.
 */
function trimOneTrailingSpace(text: string): string {
  return text.endsWith(' ') ? text.slice(0, -1) : text;
}

/** Craft exports display math fenced on its own lines, and the shape is also accepted inline. */const DISPLAY_MATH = /^\$\$/;

/**
 * Converts Markdown (or the `text.md` of a Text Bundle) into the same node JSON
 * the editor stores. Deliberately dependency-free and scoped to what Craft has a
 * block for: headings, lists, tasks, quotes, code, rules, images and inline marks.
 */
export function parseMarkdown(source: string): PmNode {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const content = parseBlocks(lines);
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

function parseBlocks(lines: string[]): PmNode[] {
  const blocks: PmNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = /^```(.*)$/.exec(line);
    if (fence) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      const bodyText = body.length ? trimOneTrailingSpace(body.join('\n')) : '';
      // A fence whose body starts with an HTML comment is dropped whole (G1245) — the official
      // importer uses this to keep a comment from being read as content. The check is on the
      // trimmed start, so leading blank lines do not save it.
      if (bodyText.trimStart().startsWith('<!--')) continue;
      blocks.push({
        type: 'codeBlock',
        attrs: { language: normalizeLanguage(fence[1]) },
        content: body.length ? [{ type: 'text', text: bodyText }] : undefined,
      });
      continue;
    }

    if (DISPLAY_MATH.test(line.trim())) {
      const single = /^\$\$(.+)\$\$$/.exec(line.trim());
      if (single) {
        blocks.push({ type: 'mathBlock', attrs: { latex: single[1].trim() } });
        index += 1;
        continue;
      }
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !DISPLAY_MATH.test(lines[index].trim())) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: 'mathBlock', attrs: { latex: body.join('\n').trim() } });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: 'heading',
        attrs: { level: heading[1].length },
        content: parseInline(heading[2]),
      });
      index += 1;
      continue;
    }

    if (DIVIDER_MARKUP_PATTERN.test(line.trim())) {
      // The sigil characters carry the weight (G1229): `---` is the default `regular`, not the
      // heaviest, and `===` reaches the page-separator style the UI has no entry for. A rule the
      // table does not name still lands on the default.
      const markup = line.trim();
      blocks.push({
        type: 'divider',
        attrs: { style: dividerStyleFromMarkup(markup) ?? DEFAULT_DIVIDER_STYLE },
      });
      index += 1;
      continue;
    }

    // A pipe row followed by an alignment row is a table. The alignment row is recognised by
    // "nothing but hyphens", so a colon-marked row is data, not alignment (G1240).
    if (/^\s*\|.*\|\s*$/.test(line) && index + 1 < lines.length && /^\s*\|.*\|\s*$/.test(lines[index + 1])) {
      const first = splitRow(lines[index]);
      const second = splitRow(lines[index + 1]);
      if (isAlignmentRow(second)) {
        const rows: string[][] = [first];
        index += 2;
        while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
          rows.push(splitRow(lines[index]));
          index += 1;
        }
        // G1240: a header row with no non-blank cell is dropped entirely rather than rendered
        // as an empty first row.
        const hasHeader = hasHeaderContent(rows[0] ?? []);
        const dataRows = hasHeader ? rows : rows.slice(1);
        // G1240: every cell is parsed as its own block document (first block wins), and the table
        // carries three pre-generated uuid groups so rows/columns/cells are addressable at birth.
        const columnCount = Math.max(0, ...dataRows.map((cells) => cells.length));
        const ids = mintTableIds(dataRows.length, columnCount, () => crypto.randomUUID());
        blocks.push({
          type: 'table',
          attrs: { pluginData: ids },
          content: dataRows.map((cells, rowIndex) => ({
            type: 'tableRow',
            // G439: `rowId`/`cellId` are the editor's stable-id attributes (Editor.tsx), so an
            // imported table is addressable from the moment it lands — not only after a round trip.
            attrs: { rowId: ids.rows[rowIndex] },
            content: cells.map((cell, colIndex) => ({
              type: 'tableCell',
              attrs: { cellId: ids.cells[rowIndex]?.[colIndex] ?? null },
              content: parseCellBlocks<PmNode>(cell, (text) => parseBlocks(text.split('\n'))),
            })),
          })),
        });
        continue;
      }
    }

    // G674: three Craft-specific extensions ride on plain Markdown — `<callout>…</callout>`
    // becomes a callout block, a line starting `+ ` becomes a toggle, `>` stays a quote.
    // G1403：官方单行形 `<callout>#### On iOS :</callout>` 也要能读回（行首记号随内容保留）。
    const calloutInline = /^<callout(?:\s+type="([^"]+)")?\s*>(.*)<\/callout>$/i.exec(line.trim());
    if (calloutInline) {
      const allowed = new Set(['info', 'warning', 'error', 'success', 'note']);
      const clType = (calloutInline[1] ?? 'info').toLowerCase();
      blocks.push({
        type: 'callout',
        attrs: { type: allowed.has(clType) ? clType : 'info' },
        content: calloutInline[2].trim() ? parseBlocks([calloutInline[2]]) : [{ type: 'paragraph' }],
      });
      index += 1;
      continue;
    }

    const calloutOpen = /^<callout(?:\s+type="([^"]+)")?\s*>$/i.exec(line.trim());
    if (calloutOpen) {
      const allowed = new Set(['info', 'warning', 'error', 'success', 'note']);
      const type = (calloutOpen[1] ?? 'info').toLowerCase();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*<\/callout>\s*$/i.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({
        type: 'callout',
        attrs: { type: allowed.has(type) ? type : 'info' },
        content: body.length ? parseBlocks(body) : [{ type: 'paragraph' }],
      });
      continue;
    }

    if (/^\+\s+/.test(line)) {
      const firstLine = line.replace(/^\+\s+/, '');
      const nested: string[] = [];
      index += 1;
      // G674: child rows must be indented under the toggle; they become its content.
      while (index < lines.length && /^\s{2,}\S/.test(lines[index])) {
        nested.push(lines[index].replace(/^\s{2}/, ''));
        index += 1;
      }
      blocks.push({
        type: 'toggleBlock',
        attrs: { open: false },
        content: [
          { type: 'paragraph', content: parseInline(firstLine) },
          ...(nested.length ? parseBlocks(nested) : []),
        ],
      });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({
        type: 'blockquote',
        content: parseBlocks(body),
      });
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line.trim());
    if (image) {
      blocks.push({
        type: 'imageBlock',
        // G1241：官方导入形状七个字段——uploaded 恒 true、aspectRatio 恒 1.5，
        // url/rawUrl/fileName 三处都等于 src。
        attrs: {
          src: image[2],
          alt: image[1] || null,
          uploaded: true,
          url: image[2],
          rawUrl: image[2],
          fileName: image[2],
          aspectRatio: 1.5,
        },
      });
      index += 1;
      continue;
    }

    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const collected: string[] = [];
      while (
        index < lines.length &&
        (/^\s*([-*+]|\d+[.)])\s+/.test(lines[index]) || (lines[index].trim() && /^\s{2,}/.test(lines[index])))
      ) {
        collected.push(lines[index]);
        index += 1;
      }
      blocks.push(parseList(collected));
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !DISPLAY_MATH.test(lines[index].trim()) &&
      !/^\s*([-*+]|\d+[.)])\s+/.test(lines[index]) &&
      !/^>|^```|^#{1,6}\s/.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', content: parseInline(paragraph.join(' ')) });
  }

  return blocks;
}

interface ListItem {
  indent: number;
  text: string;
  checked: boolean | null;
  ordered: boolean;
}

function parseList(lines: string[]): PmNode {
  const items: ListItem[] = lines.map((line) => {
    const indent = line.length - line.trimStart().length;
    const marker = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    const raw = marker ? marker[3] : line.trim();
    const task = /^\[([ xX])\]\s+(.*)$/.exec(raw);
    return {
      indent,
      text: task ? task[2] : raw,
      checked: task ? task[1].toLowerCase() === 'x' : null,
      ordered: marker ? /\d/.test(marker[2]) : false,
    };
  });

  const ordered = items[0]?.ordered ?? false;
  const taskList = items.some((item) => item.checked !== null);
  const listType = taskList ? 'taskList' : ordered ? 'orderedList' : 'bulletList';

  const build = (start: number, indent: number): { nodes: PmNode[]; next: number } => {
    const nodes: PmNode[] = [];
    let cursor = start;

    while (cursor < items.length && items[cursor].indent >= indent) {
      if (items[cursor].indent > indent) {
        const nested = build(cursor, items[cursor].indent);
        const last = nodes[nodes.length - 1];
        if (last) last.content = [...(last.content ?? []), ...(nested.nodes[0] ? [nested.nodes[0]] : [])];
        cursor = nested.next;
        continue;
      }

      const item = items[cursor];
      cursor += 1;
      const deeper =
        cursor < items.length && items[cursor].indent > indent ? build(cursor, items[cursor].indent) : null;
      if (deeper) cursor = deeper.next;

      const paragraph: PmNode = { type: 'paragraph', content: parseInline(item.text) };
      const content = deeper ? [paragraph, ...deeper.nodes] : [paragraph];
      nodes.push({
        type: taskList ? 'taskItem' : 'listItem',
        attrs: taskList ? { checked: item.checked ?? false } : undefined,
        content,
      });
    }

    return { nodes: [{ type: listType, content: nodes }], next: cursor };
  };

  return build(0, items[0]?.indent ?? 0).nodes[0];
}

const INLINE =
  /(`[^`]+`)|\$\$([^$\n]+)\$\$|\$([^$\n]+)\$|(<(?:strong|em|s|span|mark|a)\b[^>]*>[\s\S]*?<\/(?:strong|em|s|span|mark|a)>)|\*\*[\s\S]+?\*\*(?!\*)|(~~[\s\S]+?~~)|((?<!\*)\*(?!\s)[^*\n]+?\*(?!\*))|((?<!_)_(?!_)[^_\n]+?_(?!_))|(\[[^\]]*\]\([^)\s]+\))|(!\[[^\]]*\]\([^)\s]+\))/;

/**
 * G1236: an inline HTML tag maps onto a local mark through the collected table. `span` is
 * recognised but decorates nothing; any other tag is dropped silently, exactly as the official
 * dispatch does (its `default:` is a `continue`).
 */
function inlineHtmlMark(tag: string, attrs: string): { type: string; attrs?: Record<string, unknown> } | null {
  switch (tag.toLowerCase()) {
    case 'strong':
      return { type: 'bold' };
    case 'em':
      return { type: 'italic' };
    case 's':
      return { type: 'strike' };
    case 'mark':
      return { type: 'highlight', attrs: { color: DEFAULT_HIGHLIGHT_COLOR } };
    case 'a': {
      const href = /href\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? '';
      return { type: 'link', attrs: { href } };
    }
    case 'span':
      return null;
    default:
      return null;
  }
}

function parseInline(text: string): PmNode[] {
  const nodes: PmNode[] = [];
  let rest = text;

  while (rest.length) {
    const match = INLINE.exec(rest);
    if (!match) {
      pushText(nodes, rest);
      break;
    }
    const at = match.index;
    if (at > 0) pushText(nodes, rest.slice(0, at));

    const token = match[0];
    if (token.startsWith('`')) {
      pushMarked(nodes, token.slice(1, -1), { type: 'code' });
    } else if (token.startsWith('$$')) {
      // Inline math is `$…$` (or `$$…$$` on one line); the block form is handled earlier, so a
      // pair that reaches here is inline. The node carries the source without the delimiters.
      nodes.push({ type: 'inlineMath', attrs: { latex: token.slice(2, -2) } });
    } else if (token.startsWith('$')) {
      nodes.push({ type: 'inlineMath', attrs: { latex: token.slice(1, -1) } });
    } else if (token.startsWith('<')) {
      // G1236: `<strong>…</strong>` and friends become the same marks the punctuation forms do.
      const html = /^<([a-zA-Z]+)\b([^>]*)>([\s\S]*)<\/\1>$/.exec(token);
      const mark = html ? inlineHtmlMark(html[1], html[2]) : null;
      const inner = html?.[3] ?? '';
      if (mark) addMark(parseInline(inner), mark, nodes);
      else pushText(nodes, inner);
    } else if (token.startsWith('**')) {
      addMark(parseInline(token.slice(2, -2)), { type: 'bold' }, nodes);
    } else if (token.startsWith('~~')) {
      addMark(parseInline(token.slice(2, -2)), { type: 'strike' }, nodes);
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]*)\]\(([^)\s]+)\)$/.exec(token);
      const href = link?.[2] ?? '';
      // G1238: the official importer stores inline math as a `tex://` link run, so a link whose URL
      // carries that scheme reads back as math rather than as a link.
      const latex = mathFromLink(href);
      if (latex !== null) {
        nodes.push({ type: 'inlineMath', attrs: { latex } });
      } else {
        addMark(parseInline(link?.[1] ?? ''), { type: 'link', attrs: { href } }, nodes);
      }
    } else if (token.startsWith('![')) {
      const alt = /^!\[([^\]]*)\]/.exec(token)?.[1] ?? '';
      if (alt) pushText(nodes, alt);
    } else {
      addMark(parseInline(token.slice(1, -1)), { type: 'italic' }, nodes);
    }

    rest = rest.slice(at + token.length);
  }

  return nodes;
}

function pushText(nodes: PmNode[], text: string): void {
  if (text) nodes.push({ type: 'text', text });
}

function pushMarked(
  nodes: PmNode[],
  text: string,
  mark: { type: string; attrs?: Record<string, unknown> }
): void {
  if (text) nodes.push({ type: 'text', text, marks: [mark] });
}

function addMark(
  children: PmNode[],
  mark: { type: string; attrs?: Record<string, unknown> },
  out: PmNode[]
): void {
  for (const child of children) {
    if (child.type !== 'text') continue;
    out.push({ ...child, marks: [mark, ...(child.marks ?? [])] });
  }
}

export function titleFromMarkdown(source: string): string {
  const lines = source.split(/\r?\n/);
  for (const line of lines) {
    const heading = /^#{1,6}\s+(.*)$/.exec(line.trim());
    if (heading) return cleanTitle(heading[1]);
  }
  for (const line of lines) {
    if (line.trim()) return cleanTitle(line);
  }
  return '导入的笔记';
}

function cleanTitle(value: string): string {
  const plain = value
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .trim();
  return plain.slice(0, 80) || '导入的笔记';
}

/**
 * A Text Bundle is a folder; the readable part is its `text.md`, and the shallowest
 * one wins when several bundles are picked at once.
 */
export function pickTextBundleEntry(paths: string[]): string | null {
  const entries = paths.filter((path) => /(^|\/)[^/]+\.textbundle\/text\.md$/i.test(path));
  if (!entries.length) return null;
  return entries.sort(
    (a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b)
  )[0];
}
