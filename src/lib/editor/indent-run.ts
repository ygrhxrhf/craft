/**
 * G279 —— 移动的单位是「含缩进子块的整块」，不是一个块。
 *
 * 官方那三个名字说的是同一件事：`extendWithIndentChildren`（把缩进更深的后续兄弟并进来）＋
 * `firstLastSelectedIdxInParent`（选区在父里的首/尾锚）＋ `getMinIndentOfSelection`（并进来的
 * 门槛＝选区里最浅的那层缩进）。落到本地，缩进是块上的 `indent` 数值（见 `block-indent.ts`），
 * 于是「整块」＝**从该块起、直到第一个缩进不深于它的兄弟为止**这一段连续区间。
 *
 * 输入就是兄弟们的缩进序列（`number[]`）——最贴近调用方手里已有的东西，省掉一次包装。
 */

export interface IndentRun {
  /** 区间起点（含）。 */
  start: number;
  /** 区间终点（不含）＝第一个缩进不深于基准的兄弟。 */
  end: number;
}

/**
 * 第 `index` 块的移动单位。空序列或越界返回一个空区间（`start === end === index`），
 * 调用方据此判定「没东西可移」。缩进更深的后继兄弟一律并进来，**不递归看它们的孩子**——
 * 孩子本身也在这段连续区间里，因为它们的缩进只会更深。
 */
export function indentRunOf(indents: number[], index: number): IndentRun {
  if (index < 0 || index >= indents.length) return { start: index, end: index };
  const base = indents[index];
  let end = index + 1;
  while (end < indents.length && indents[end] > base) end += 1;
  return { start: index, end };
}

/** 选区覆盖的块（首锚与尾锚所在的顶层块）对应的整块区间：取首块的起点、尾块的终点。 */
export function selectionRunOf(indents: number[], fromIndex: number, toIndex: number): IndentRun {
  const first = indentRunOf(indents, Math.min(fromIndex, toIndex));
  const last = indentRunOf(indents, Math.max(fromIndex, toIndex));
  return { start: first.start, end: last.end };
}
