/**
 * G1136: the official marquee hit tester dispatches on the layout type. Verbatim shape:
 *
 *   `IVt(t,e)`: `list` → the folder/record scan; `cards` → the record scan plus a grid-arithmetic
 *   prune over `documentsGrid`; `waterfall` → a column prune plus a binary search over `itemTops`.
 *   The folder region always participates, whichever type the documents are in.
 *
 * All three end in the same strict-intersection test (`j7e`, see `marquee.ts`); the difference is
 * how many candidate rects each one has to test. The pruned paths are therefore *exact*, not
 * approximate: `hit-test.test.ts` asserts equality against the flat scan on randomised layouts.
 */
import { rectsIntersect, type ItemRect, type Rect } from './marquee';

export type MarqueeLayout = 'list' | 'cards' | 'waterfall';

export interface HitGeometry {
  layout: MarqueeLayout;
  /** The document items, in the order the screen lists them. */
  items: readonly ItemRect[];
  /** The folder region — always tested with the record scan, as in the official build. */
  folders?: readonly ItemRect[];
}

/** Rounds away sub-pixel drift so a column is one bucket rather than a fuzzy band. */
function bucket(value: number): number {
  return Math.round(value);
}

/** The record scan: every rect, in order (`Nee` in the official module). */
function recordHits(band: Rect, items: readonly ItemRect[]): string[] {
  return items.filter((item) => rectsIntersect(band, item)).map((item) => item.id);
}

/**
 * `kVt`: the grid prune. Items are bucketed into cells by their rounded column/row band, the
 * band's edges then give the column and row index ranges directly — `floor((band.left − origin) /
 * (columnWidth + gap))`, verbatim — and only the cells inside those ranges are re-tested.
 */
function gridHits(band: Rect, items: readonly ItemRect[]): string[] {
  if (items.length < 2) return recordHits(band, items);

  const columns = [...new Set(items.map((item) => bucket(item.left)))].sort((a, b) => a - b);
  const rows = [...new Set(items.map((item) => bucket(item.top)))].sort((a, b) => a - b);
  const colIndex = new Map(columns.map((left, index) => [left, index]));
  const rowIndex = new Map(rows.map((top, index) => [top, index]));

  const cells = new Map<string, ItemRect[]>();
  for (const item of items) {
    const key = `${colIndex.get(bucket(item.left))}:${rowIndex.get(bucket(item.top))}`;
    const cell = cells.get(key);
    if (cell) cell.push(item);
    else cells.set(key, [item]);
  }

  // `columnWidth + gap` is exactly the pitch between neighbouring columns (same for rows).
  const pitchX = columns.length > 1 ? columns[1] - columns[0] : 0;
  const pitchY = rows.length > 1 ? rows[1] - rows[0] : 0;

  const sofar = (value: number, origin: number, pitch: number, count: number) =>
    pitch > 0 ? Math.max(0, Math.min(count - 1, Math.floor((value - origin) / pitch))) : 0;
  const firstColumn = sofar(band.left, columns[0], pitchX, columns.length);
  const lastColumn = sofar(band.left + band.width, columns[0], pitchX, columns.length);
  const firstRow = sofar(band.top, rows[0], pitchY, rows.length);
  const lastRow = sofar(band.top + band.height, rows[0], pitchY, rows.length);

  const hits: string[] = [];
  for (let column = firstColumn; column <= lastColumn; column += 1) {
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (const item of cells.get(`${column}:${row}`) ?? []) {
        if (rectsIntersect(band, item)) hits.push(item.id);
      }
    }
  }
  return hits;
}

/**
 * `vVt`: the waterfall prune. Each column keeps its items' tops in order, so a binary search finds
 * the first item whose bottom still crosses the band's top and the scan stops at the first top that
 * starts below the band's bottom — `O(log n + k)` rather than `O(n)`.
 */
function waterfallHits(band: Rect, items: readonly ItemRect[]): string[] {
  if (items.length < 2) return recordHits(band, items);

  const byColumn = new Map<number, ItemRect[]>();
  for (const item of items) {
    const column = bucket(item.left);
    const list = byColumn.get(column);
    if (list) list.push(item);
    else byColumn.set(column, [item]);
  }

  const hits: string[] = [];
  for (const column of [...byColumn.keys()].sort((a, b) => a - b)) {
    const list = byColumn.get(column)!;
    list.sort((a, b) => a.top - b.top);

    let low = 0;
    let high = list.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (list[mid].top + list[mid].height <= band.top) low = mid + 1;
      else high = mid;
    }
    for (let index = low; index < list.length; index += 1) {
      if (list[index].top >= band.top + band.height) break;
      if (rectsIntersect(band, list[index])) hits.push(list[index].id);
    }
  }
  return hits;
}

/**
 * The dispatch (`IVt`). The result keeps the caller's item order so the selection anchor — the
 * last hit — is the same one a flat scan would report.
 */
export function hitTest(band: Rect, geometry: HitGeometry): string[] {
  const ordered = [
    ...(geometry.folders ? recordHits(band, geometry.folders) : []),
    ...(geometry.layout === 'cards'
      ? gridHits(band, geometry.items)
      : geometry.layout === 'waterfall'
        ? waterfallHits(band, geometry.items)
        : recordHits(band, geometry.items)),
  ];
  const rank = new Map<string, number>();
  for (const [index, item] of [...(geometry.folders ?? []), ...geometry.items].entries()) {
    if (!rank.has(item.id)) rank.set(item.id, index);
  }
  return ordered.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
}
