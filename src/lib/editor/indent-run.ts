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
 * G660 —— 缩进是**位置几何**，不是父子指针：一层缩进由块上的数值表达。官方的
 * `indentLevel` 是**风格属性**，它可以显式为 `null`；`nD` 的条件是 `c != null && pred(c)`，
 * 于是这种行既不入选子树、也不切断子树（跳过继续读）。本地把这一点落成 `null` 行中性。
 *
 * 另有一类行与官方不同：**该块类型根本没有缩进槽**（表格、图片、代码块、列表容器在本地
 * 没有 `indent` 属性）读作 `undefined`，它是**几何断点**——这些块不能被嵌进一段缩进里，
 * 把它们并进区间会让「上移一块」变成「上移半个文档」。两类缺失因此分开表达。
 */
export type IndentRow = number | null | undefined;

function levelOf(value: IndentRow): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * 第 `index` 块的移动单位。空序列或越界返回一个空区间（`start === end === index`），
 * 调用方据此判定「没东西可移」。缩进更深的后继兄弟一律并进来，**不递归看它们的孩子**——
 * 孩子本身也在这段连续区间里，因为它们的缩进只会更深。
 */
export function indentRunOf(indents: IndentRow[], index: number): IndentRun {
  if (index < 0 || index >= indents.length) return { start: index, end: index };
  const base = levelOf(indents[index]);
  let end = index + 1;
  while (end < indents.length) {
    const level = indents[end];
    // G660: an explicitly null level neither counts as a child nor ends the run.
    if (level === null) {
      end += 1;
      continue;
    }
    // No indent slot on this block type: it cannot be nested, so the run stops here.
    if (typeof level !== 'number' || !Number.isFinite(level)) break;
    if (level > base) {
      end += 1;
      continue;
    }
    break;
  }
  return { start: index, end };
}

/** 选区覆盖的块（首锚与尾锚所在的顶层块）对应的整块区间：取首块的起点、尾块的终点。 */
export function selectionRunOf(indents: IndentRow[], fromIndex: number, toIndex: number): IndentRun {
  const first = indentRunOf(indents, Math.min(fromIndex, toIndex));
  const last = indentRunOf(indents, Math.max(fromIndex, toIndex));
  return { start: first.start, end: last.end };
}
