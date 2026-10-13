/**
 * Table formulas (G23). A cell holds `=NAME(ref)`, where the ref is either an A1 range or one of the
 * four directions collected from the catalog — ABOVE, BELOW, LEFT, RIGHT — taken relative to the cell
 * the formula sits in. The result replaces the formula, matching the evaluator that was already here,
 * so a number prints whole when it is whole and to two places otherwise.
 */

export type FormulaDirection = 'above' | 'below' | 'left' | 'right';

export const FORMULA_DIRECTIONS: readonly FormulaDirection[] = ['above', 'below', 'left', 'right'];

/** The cells a direction names, as 1-based coordinates, nearest first. Nothing past the edge. */
export function cellsInDirection(
  rows: number,
  cols: number,
  row: number,
  col: number,
  direction: FormulaDirection,
): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  const push = (r: number, c: number) => cells.push({ row: r, col: c });
  switch (direction) {
    case 'above':
      for (let r = row - 1; r >= 1; r--) push(r, col);
      break;
    case 'below':
      for (let r = row + 1; r <= rows; r++) push(r, col);
      break;
    case 'left':
      for (let c = col - 1; c >= 1; c--) push(row, c);
      break;
    case 'right':
      for (let c = col + 1; c <= cols; c++) push(row, c);
      break;
  }
  return cells;
}

const RANGE = /^([A-Za-z]+)(\d+)(?::([A-Za-z]+)(\d+))?$/;
const FORMULA = /^=([A-Za-z][A-Za-z0-9]*)(?:\(([^)]*)\))?$/;

function columnIndex(label: string): number {
  let col = 0;
  for (const ch of label.toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return col;
}

function numbersIn(text: string): number[] {
  return (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map((match) => parseFloat(match));
}

function formatResult(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * The value of a formula, or null when the text is not one. `grid` is the table's text, row-major,
 * and `row`/`col` are the 1-based position of the cell being read.
 */
export function evaluateCellFormula(
  text: string,
  grid: readonly (readonly string[])[],
  row: number,
  col: number,
): string | null {
  const match = text.trim().match(FORMULA);
  if (!match) return null;
  const name = match[1].toLowerCase();
  const arg = (match[2] ?? '').trim();

  const constant = CONSTANT[name];
  if (constant !== undefined && arg === '') return formatResult(constant);

  const cells = cellsFor(arg, grid, row, col);
  if (!cells) return null;
  const nums = cells.flatMap((cell) => numbersIn(grid[cell.row - 1]?.[cell.col - 1] ?? ''));

  switch (name) {
    case 'sum':
      return formatResult(nums.reduce((a, b) => a + b, 0));
    case 'avg':
    case 'average':
      return formatResult(nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
    case 'min':
      return formatResult(nums.length ? Math.min(...nums) : 0);
    case 'max':
      return formatResult(nums.length ? Math.max(...nums) : 0);
    case 'count':
      return formatResult(nums.length);
    case 'counta':
      return formatResult(cells.filter((cell) => (grid[cell.row - 1]?.[cell.col - 1] ?? '').trim() !== '').length);
    case 'product':
      return formatResult(nums.length ? nums.reduce((a, b) => a * b, 1) : 0);
    case 'median':
      return formatResult(median(nums));
    case 'abs':
      return formatResult(Math.abs(nums[0] ?? 0));
    case 'int':
      return formatResult(Math.floor(nums[0] ?? 0));
    case 'round':
      return formatResult(Math.round(nums[0] ?? 0));
    case 'sign':
      return formatResult(Math.sign(nums[0] ?? 0));
    default:
      return null;
  }
}

const CONSTANT: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  ln2: Math.LN2,
  ln10: Math.LN10,
  log2e: Math.LOG2E,
  log10e: Math.LOG10E,
  sqrt2: Math.SQRT2,
  sqrt1_2: Math.SQRT1_2,
};

function cellsFor(
  arg: string,
  grid: readonly (readonly string[])[],
  row: number,
  col: number,
): { row: number; col: number }[] | null {
  const direction = FORMULA_DIRECTIONS.find((item) => item === arg.toLowerCase());
  if (direction) return cellsInDirection(grid.length, grid[0]?.length ?? 0, row, col, direction);
  const range = arg.match(RANGE);
  if (!range) return null;
  const from = { row: parseInt(range[2], 10), col: columnIndex(range[1]) };
  const to = range[3] ? { row: parseInt(range[4], 10), col: columnIndex(range[3]) } : from;
  const cells: { row: number; col: number }[] = [];
  for (let r = Math.min(from.row, to.row); r <= Math.max(from.row, to.row); r++) {
    for (let c = Math.min(from.col, to.col); c <= Math.max(from.col, to.col); c++) cells.push({ row: r, col: c });
  }
  return cells;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
