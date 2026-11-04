/**
 * G1430 —— 插入面板末项「插入表格」的**行列网格选择器**（官方提示语逐字：
 * 「插入一个包含所选行数和列数的表格。」＝`interactions.md` V10 屏侧读回，两份捕获字节一致）。
 *
 * 官方网格本身的尺寸没采到（只读到提示语与"用选中行列插表"这层语义），所以这里取 10×10：
 * 落在本地表格硬上限（50 行 / 15 列 / 750 格）之内，也足够表达"所选行数和列数"。
 * 尺寸是**本地边界**，不是官方读数——要改只改这两个常量。
 */

export const TABLE_GRID_ROWS = 10;
export const TABLE_GRID_COLS = 10;

export interface TableSize {
  rows: number;
  cols: number;
}

/** 悬停到第 `row` 行第 `col` 列（0 基）＝要插一张 (row+1) × (col+1) 的表。 */
export function tableSizeAtCell(row: number, col: number): TableSize {
  return { rows: row + 1, cols: col + 1 };
}

/** 预览高亮：从左上角一直铺到悬停格（含），也就是"这张表会长多大"。 */
export function cellInPreview(
  cell: { row: number; col: number },
  hover: TableSize | null
): boolean {
  if (!hover) return false;
  return cell.row < hover.rows && cell.col < hover.cols;
}
