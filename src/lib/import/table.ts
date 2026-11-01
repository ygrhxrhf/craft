/**
 * Table import (G1240). Three judgements, verbatim from the official parser:
 *
 * 1. A row is dropped when every cell is made only of hyphens — that is how the alignment row is
 *    recognised, *not* by looking for `:` markers. A cell that was empty to begin with is kept.
 * 2. A cell's `<br>` becomes a placeholder before the cell body is parsed, and the placeholder is
 *    turned back into a real newline afterwards.
 * 3. The cell body then loses one trailing CRLF pair or a single LF.
 */
export const CELL_BREAK_PLACEHOLDER = '\\newline__craft';

/** Split a markdown table row on unescaped pipes, dropping the leading and trailing empties. */
export function splitRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (char === '\\' && trimmed[i + 1] === '|') {
      current += '|';
      i += 1;
      continue;
    }
    if (char === '|') {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

/**
 * Whether a row is the alignment row: every cell is empty, or every cell is nothing but hyphens
 * once they are removed. A cell that is already blank counts as satisfying the test.
 */
export function isAlignmentRow(cells: readonly string[]): boolean {
  if (cells.length === 0) return false;
  return cells.every((cell) => {
    if (cell.trim() === '') return true;
    return cell.replace(/-/g, '').trim() === '';
  });
}

/** G1240: whether a header row has any non-blank cell (an all-blank header is dropped). */
export function hasHeaderContent(cells: readonly string[]): boolean {
  return cells.some((cell) => cell.trim() !== '');
}

/** Swap `<br>` for the placeholder, so the cell parser does not treat it as markup. */
export function hideCellBreaks(cell: string): string {
  return cell.replace(/<br\s*\/?>/gi, CELL_BREAK_PLACEHOLDER);
}

/** Turn the placeholder back into a real newline. */
export function restoreCellBreaks(cell: string): string {
  return cell.split(CELL_BREAK_PLACEHOLDER).join('\n');
}

/** Drop one trailing CRLF pair or a single LF, as the official cell parser does. */
export function trimTrailingNewline(cell: string): string {
  if (cell.endsWith('\r\n')) return cell.slice(0, -2);
  if (cell.endsWith('\n')) return cell.slice(0, -1);
  return cell;
}

/** The full cell pipeline: hide breaks, (the caller parses here), restore, trim. */
export function prepareCell(cell: string): string {
  return trimTrailingNewline(restoreCellBreaks(hideCellBreaks(cell)));
}

/**
 * G1240: the cell body is parsed as its **own document** and only the first block is taken; a body
 * that parses to nothing falls back to an empty paragraph. This is what lets a cell hold a heading,
 * a list, or any block the block parser understands — not just inline text.
 *
 * `parse` is injected so this module stays free of the block parser (which imports this one). A cell
 * whose body is blank yields an empty paragraph rather than vanishing.
 */
export function parseCellBlocks<T>(
  cell: string,
  parse: (text: string) => T[],
): T[] {
  const body = prepareCell(cell);
  if (!body.trim()) return [{ type: 'paragraph' } as unknown as T];
  const blocks = parse(body);
  return blocks.length ? [blocks[0]] : [{ type: 'paragraph' } as unknown as T];
}

/**
 * G1240: the table block carries three pre-generated uuid groups in `pluginData` — `rows`,
 * `columns`, `cells` — so every row/column/cell has a stable id from the moment it is created,
 * rather than being minted lazily on first edit.
 */
export interface TableIds {
  rows: string[];
  columns: string[];
  cells: string[][];
}

export function mintTableIds(
  rowCount: number,
  columnCount: number,
  mint: () => string,
): TableIds {
  const rows = Array.from({ length: Math.max(0, rowCount) }, () => mint());
  const columns = Array.from({ length: Math.max(0, columnCount) }, () => mint());
  const cells = Array.from({ length: rows.length }, () =>
    Array.from({ length: columns.length }, () => mint()),
  );
  return { rows, columns, cells };
}

