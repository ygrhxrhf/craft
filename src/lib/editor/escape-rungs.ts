/**
 * G633 —— `Esc` 是一台**多级降级机**，不是「取消」的同义词。官方的三档（`qs="Escape"`）：
 *
 *   ① 在表格里 → `singleCellSelection`（当前那一格成为选区）；
 *   ② 有范围选区 → 塌成光标（`eo.select({focus, anchor: focus})`）；
 *   ③ 否则 → 选中整块（`St(Et.blocks([id]))`）。
 *
 * G1583 补上第 ④ 档：块已选中时再按一次离开编辑器。本地的顺序是「手边最近的层级先退」：
 * 块选中（第 ③ 档的产物）→ 单元格 → 范围 → 块。
 *
 * 第 ① 档必须**排除"已经是单格选区"**这一态：否则单格选区会不断把自己重选成单格，`Esc` 在
 * 表格里永远退不出去。排除之后整条阶梯是「光标（格内）→ 单格 → 光标 → 整块 → 离开」，四步
 * 各不相同，可逐下验证。
 */

export type EscapeRung = 'leave' | 'table-cell' | 'collapse' | 'block';

export interface EscapeInput {
  /** 当前是块选中态（`NodeSelection`，即第 ③ 档的产物）。 */
  blockSelected: boolean;
  /** 光标或选区落在表格单元格里。 */
  inTableCell: boolean;
  /** 当前正好是一格选区（已经退到过第 ① 档）。 */
  singleCellSelected: boolean;
  /** 选区有长度（非塌缩）。 */
  hasRange: boolean;
}

/** 这一下 `Esc` 该退哪一档。第 ③ 档总能落地（任一位置都属于某个顶层块），所以不会有空档。 */
export function escapeRung(input: EscapeInput): EscapeRung {
  if (input.blockSelected) return 'leave';
  if (input.inTableCell && !input.singleCellSelected) return 'table-cell';
  if (input.hasRange) return 'collapse';
  return 'block';
}