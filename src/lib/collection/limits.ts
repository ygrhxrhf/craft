/**
 * G690 / G659 —— 两张硬上限，单位不同：
 *
 * - 集合列：20 列，**标题列不计入**。超限是校验层拒绝，错误形如
 *   `Validation failed: properties: Collection cannot have more than 20 columns (properties)`。
 * - 编辑器表格：50 行 / 15 列 / 750 格，三条同时成立才允许；超限反馈是一句 toast
 *   「已达到表格大小限制（15 列，50 行）」+ 副标题「尝试多个较小的表格吗？」
 *   （`alert.table.size.limit.reached` / `alert.try.smaller.tables`）。
 *
 * G484 的 600 是**渲染棘轮**（行数 × 可见列数），与 750 的数据上限分层，不是同一个数。
 */

export const MAX_COLLECTION_COLUMNS = 20;

export const COLLECTION_COLUMN_LIMIT_MESSAGE =
  'Validation failed: properties: Collection cannot have more than 20 columns (properties)';

/** 已有 `count` 个常规列时还能不能再加一列（标题列不在 `count` 里）。 */
export function canAddColumn(count: number): boolean {
  return Number.isFinite(count) && count < MAX_COLLECTION_COLUMNS;
}

export const MAX_TABLE_ROWS = 50;
export const MAX_TABLE_COLS = 15;
export const MAX_TABLE_CELLS = 750;

/** 50 行 / 15 列 / 750 格三条上限同时检查。 */
export function tableSizeAllowed(rows: number, columns: number): boolean {
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 0 || columns < 0) return false;
  return rows <= MAX_TABLE_ROWS && columns <= MAX_TABLE_COLS && rows * columns <= MAX_TABLE_CELLS;
}

/** 官方 toast 的两枚参数是**上限本身**（`{0:15,1:50}`），不是这次尝试的尺寸。 */
export function tableSizeLimitTitle(): string {
  return `已达到表格大小限制（${MAX_TABLE_COLS} 列，${MAX_TABLE_ROWS} 行）`;
}

export const TABLE_SIZE_LIMIT_SUBTITLE = '尝试多个较小的表格吗？';
export const TABLE_SIZE_LIMIT_DURATION = 4000;

/** 超限时返回 toast 主句，未超限返回 `null`。 */
export function tableSizeLimitMessage(rows: number, columns: number): string | null {
  return tableSizeAllowed(rows, columns) ? null : tableSizeLimitTitle();
}

/** G484：行数 × **可见**列数超过 600 时，官方切到虚拟化渲染（隐藏列不计）。 */
export const VIRTUAL_TABLE_CELL_THRESHOLD = 600;

export function exceedsVirtualTableThreshold(rowCount: number, visibleColumnCount: number): boolean {
  return rowCount * visibleColumnCount > VIRTUAL_TABLE_CELL_THRESHOLD;
}
