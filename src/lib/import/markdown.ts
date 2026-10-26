import { DEFAULT_DIVIDER_STYLE, DIVIDER_MARKUP_PATTERN, dividerStyleFromMarkup } from '@/lib/editor/divider-styles';
import { isAlignmentRow, prepareCell, splitRow } from '@/lib/import/table';

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
        blocks.push({
          type: 'table',
          content: rows.map((cells) => ({
            type: 'tableRow',
            content: cells.map((cell) => ({
              type: 'tableCell',
              content: [{ type: 'paragraph', content: parseInline(prepareCell(cell)) }],
            })),
          })),
        });
        continue;
      }
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
      blocks.push({ type: 'imageBlock', attrs: { src: image[2], alt: image[1] || null } });
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
  /(`[^`]+`)|\$\$([^$\n]+)\$\$|\$([^$\n]+)\$|(\*\*[\s\S]+?\*\*(?!\*))|(~~[\s\S]+?~~)|((?<!\*)\*(?!\s)[^*\n]+?\*(?!\*))|((?<!_)_(?!_)[^_\n]+?_(?!_))|(\[[^\]]*\]\([^)\s]+\))|(!\[[^\]]*\]\([^)\s]+\))/;

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
    } else if (token.startsWith('**')) {
      addMark(parseInline(token.slice(2, -2)), { type: 'bold' }, nodes);
    } else if (token.startsWith('~~')) {
      addMark(parseInline(token.slice(2, -2)), { type: 'strike' }, nodes);
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]*)\]\(([^)\s]+)\)$/.exec(token);
      addMark(parseInline(link?.[1] ?? ''), { type: 'link', attrs: { href: link?.[2] ?? '' } }, nodes);
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
