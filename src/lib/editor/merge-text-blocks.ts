/**
 * G585 —— `mergeTextBlocks` 的**样式胜负四条判定**（`model.md` §一之三十一）。
 *
 * 合并两段文本时（Backspace 打在块首、把本块并进上一块），合并后的块该继承谁的样子，官方按
 * 下面四条**顺序**判（命中即停）：
 *
 *   1. 前块 `textContent == null` ⇒ **后块赢**（前块连文本都没有，没有可留的样子）；
 *   2. 后块有子块、前块没有 ⇒ **后块赢**（后块是"有结构的那个"）；
 *   3. 前块有文本 **或** 是列表项 **或** 有子块 ⇒ **前块赢**（前块是"有内容的那个"）；
 *   4. 其余 ⇒ **后块赢**。
 *
 * 方向固定：写回**前块**（`blockId1`），后块并入，光标停在拼接点。本模块只算"谁赢"这一件事，
 * 不含任何编辑器依赖，好让四条判定能被逐条钉住。
 */

export interface MergeSide {
  /** 该块的文本内容；`null` 表示连文本字段都没有（官方那支的第一个判据）。 */
  textContent: string | null;
  /** 是否列表项（bullet / ordered / task）。 */
  isListItem: boolean;
  /** 子块数量。 */
  childBlocks: number;
}

export type MergeWinner = 'previous' | 'next';

/**
 * 四条判定，按官方顺序短路。输入是**前块**（光标所在块的上一个）与**后块**（光标所在块）。
 */
export function mergeStyleWinner(previous: MergeSide, next: MergeSide): MergeWinner {
  if (previous.textContent === null) return 'next';
  if (next.childBlocks > 0 && previous.childBlocks === 0) return 'next';
  // Rule 3: the previous block has text, is a list item, or holds children — it is the one with
  // something to keep, so its style wins.
  if (previous.textContent !== '' || previous.isListItem || previous.childBlocks > 0) {
    return 'previous';
  }
  return 'next';
}

/** 三类静默 no-op（缺块 / 任一侧非文本 / 父块不可合并）——官方原样返回并记一条不一致日志。 */
export interface MergePrecondition {
  previousExists: boolean;
  nextExists: boolean;
  previousIsText: boolean;
  nextIsText: boolean;
  parentMergeable: boolean;
}

export type MergeOutcome = { ok: true } | { ok: false; reason: string };

export function canMergeTextBlocks(input: MergePrecondition): MergeOutcome {
  if (!input.previousExists || !input.nextExists) return { ok: false, reason: 'missing-block' };
  if (!input.previousIsText || !input.nextIsText) return { ok: false, reason: 'non-text-block' };
  if (!input.parentMergeable) return { ok: false, reason: 'InconsistentDocument' };
  return { ok: true };
}
