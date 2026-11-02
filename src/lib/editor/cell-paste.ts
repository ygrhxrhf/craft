/**
 * G1602 —— `Ctrl-V` 落进"有空内容的格"时，官方是**整格替换**（格内原有 `AA` 被剪贴板里的 `BB`
 * 取代，格内只剩 `BB`），而本地沿用富文本的"插入点粘贴"（`AA` 与 `BB` 并存）。
 *
 * 差别不是"清不清空"，而是**格的语义**：官方把单元格当作一个**可整体覆盖的字段**，不是一段可以
 * 往中间插字的正文。所以粘贴时要先把格清空，再放进新内容。
 *
 * 本模块只判"这次粘贴该不该先清格"，具体事务由编辑器侧执行。
 */

export interface CellPasteContext {
  /** 光标（或选区起点）是否落在表格单元格里。 */
  inCell: boolean;
  /** 该格当前是否**非空**（有文本或有块）。空格粘贴就是普通插入，不必特殊处理。 */
  cellNonEmpty: boolean;
  /** 剪贴板里的纯文本；空白视为"没有可粘的东西"。 */
  clipboardText: string;
}

/**
 * 该不该把这一格**整体覆盖**：在格内、格非空、且剪贴板有实际内容。
 * ★ 三个条件缺一不可：不在格内是普通粘贴；空格不必清；空剪贴板没东西可放。
 */
export function shouldReplaceCellOnPaste(ctx: CellPasteContext): boolean {
  if (!ctx.inCell) return false;
  if (!ctx.cellNonEmpty) return false;
  return ctx.clipboardText.trim().length > 0;
}
