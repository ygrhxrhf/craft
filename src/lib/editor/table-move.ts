/**
 * Moving a table row or column (the `table.move.*` labels). The toolbar moves the single row or
 * column the caret is in, one step. A merged cell makes the grid non-rectangular, and swapping
 * across one would break it, so a table with any span does not move.
 */

export interface CellSpan {
  colspan: number;
  rowspan: number;
}

/** True when every cell is 1 by 1 and every row is the same width. */
export function gridIsUniform(grid: readonly (readonly CellSpan[])[]): boolean {
  if (grid.length === 0 || grid[0].length === 0) return false;
  const width = grid[0].length;
  return grid.every(
    (row) => row.length === width && row.every((cell) => cell.colspan === 1 && cell.rowspan === 1),
  );
}

/**
 * The order of `count` items after moving `index` by one step. Null at the edge or for an index
 * that is not a row or column of the table.
 */
export function movedOrder(count: number, index: number, step: -1 | 1): number[] | null {
  const target = index + step;
  if (index < 0 || index >= count || target < 0 || target >= count) return null;
  const order = Array.from({ length: count }, (_, i) => i);
  [order[index], order[target]] = [order[target], order[index]];
  return order;
}
