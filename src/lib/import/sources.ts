import JSZip from 'jszip';
import TurndownService from 'turndown';

export interface SourceFile {
  name: string;
  text: string;
}

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

/** G22: Google Docs / Notion HTML exports and Evernote note bodies all land here. */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim();
}

/** Evernote `.enex`: one note per `<note>`, its body is the `<en-note>` HTML. */
export function parseEnex(text: string): SourceFile[] {
  const notes: SourceFile[] = [];
  for (const match of text.matchAll(/<note>([\s\S]*?)<\/note>/gi)) {
    const block = match[1];
    const title = /<title>([\s\S]*?)<\/title>/i.exec(block)?.[1]?.trim() || 'Evernote 笔记';
    const content = /<content>([\s\S]*?)<\/content>/i.exec(block)?.[1] ?? '';
    const body = /<en-note[^>]*>([\s\S]*?)<\/en-note>/i.exec(content)?.[1] ?? content;
    const markdown = htmlToMarkdown(body.replace(/<!\[CDATA\[|\]\]>/g, ''));
    if (markdown) notes.push({ name: `${title}.md`, text: markdown });
  }
  return notes;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { current += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else current += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { cells.push(current); current = ''; }
    else current += char;
  }
  cells.push(current);
  return cells;
}

/** Readwise CSV: group highlights by their book/source title. */
export function parseReadwiseCsv(text: string): SourceFile[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const titleIndex = header.findIndex((cell) => cell === 'title' || cell === 'book title');
  const highlightIndex = header.findIndex((cell) => cell === 'highlight' || cell === 'text');
  const noteIndex = header.findIndex((cell) => cell === 'note');
  if (titleIndex < 0 || highlightIndex < 0) return [];

  const byTitle = new Map<string, string[]>();
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const title = cells[titleIndex]?.trim() || 'Readwise';
    const highlight = cells[highlightIndex]?.trim();
    if (!highlight) continue;
    const note = noteIndex >= 0 ? cells[noteIndex]?.trim() : '';
    const entry = `> ${highlight}${note ? `\n\n${note}` : ''}`;
    byTitle.set(title, [...(byTitle.get(title) ?? []), entry]);
  }
  return [...byTitle.entries()].map(([title, entries]) => ({
    name: `${title}.md`,
    text: `# ${title}\n\n${entries.join('\n\n')}`,
  }));
}

/** Notion's export archive: read its Markdown/HTML entries into documents. */
export async function parseArchiveZip(base64: string): Promise<SourceFile[]> {
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const files: SourceFile[] = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (/\.md$/i.test(path)) {
      files.push({ name: path.split('/').pop()!.replace(/\.md$/i, '.md'), text: await entry.async('string') });
    } else if (/\.html?$/i.test(path)) {
      const html = await entry.async('string');
      const markdown = htmlToMarkdown(html);
      if (markdown) files.push({ name: path.split('/').pop()!.replace(/\.html?$/i, '.md'), text: markdown });
    }
  }
  return files;
}
