/**
 * G631 —— 表格单元格选区有**三种显式构造态**（`model.md`，官方 `Ft` 槽表 @600860）：
 *   - `singleCellSelection`：只选中一格；
 *   - `fullTableCellSelection`：选中整张表的所有格；
 *   - `emptyTableCellSelection`：**空态是一等构造器**，不是 `null`。
 * 另有 `toggleInTableCellSelection`（点某格时在"加入选区／移出选区"之间切换）。
 *
 * 本地此前只认 TipTap 原生的 `CellSelection`（能拖选与合并），但**没有把"当前选区是哪一态"读出来**
 * 的能力 ⇒ 工具栏分不出"选中一格"与"选中整表"。本模块把三态的判别与切换写成纯核。
 *
 * ☆ "空态是一等构造器"的含义：选区从"没有"到"有"是**状态迁移**，不是"null 与非 null"。本地用
 *   `kind` 判别联合表达，于是调用点必须显式处理三态（而不是用 `selection ? … : …` 把 empty 混进 null）。
 */

export type CellSelectionKind = 'single' | 'full' | 'empty';

export interface CellSelection {
  kind: CellSelectionKind;
  /** 选中的格数；`empty` 恒为 0，`full` 等于表内格数。 */
  count: number;
}

export const EMPTY_CELL_SELECTION: CellSelection = { kind: 'empty', count: 0 };

/**
 * 由"选中的格数 / 表内总格数"判别三态：
 *   - 0 格 ⇒ `empty`（一等空态）；
 *   - 等于总格数（且 > 0）⇒ `full`（整表）；
 *   - 其余 ⇒ `single`（含"多格但不满表"——官方那支把非满表的多格也归进 single 家族，
 *     因为它的三构造器是按"是否满表"分的，不是按格数 1 与 N 分的）。
 */
export function cellSelectionKind(selected: number, total: number): CellSelectionKind {
  if (selected <= 0) return 'empty';
  if (total > 0 && selected >= total) return 'full';
  return 'single';
}

export function makeCellSelection(selected: number, total: number): CellSelection {
  return { kind: cellSelectionKind(selected, total), count: Math.max(0, selected) };
}

/**
 * `toggleInTableCellSelection` —— 点某一格时的切换：已在选区里 ⇒ 移出；不在 ⇒ 加入。
 * 返回新的选中格 id 集（保持原序，新加入的追加在末尾）。
 */
export function toggleInTableCellSelection(
  selected: string[],
  cellId: string,
): string[] {
  return selected.includes(cellId)
    ? selected.filter((id) => id !== cellId)
    : [...selected, cellId];
}
