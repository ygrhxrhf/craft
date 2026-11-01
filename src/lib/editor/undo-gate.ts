/**
 * G211 —— 撤销语义的**焦点门控**与**子编辑器隔离**（动态实测 V15–V21）。
 *
 * 官方实测四条：① 一次面板建块 = 1 步；② 连续输入 26 字符 = 1 步（按输入会话合并）；
 * ③ **焦点不在编辑器时 Ctrl+Z 完全无效**（连按 7 次零变化）；④ 光标点进代码/公式/Mermaid 块时
 * Ctrl+Z 被内嵌编辑器吞掉，文档不撤销。
 *
 * 本地用 TipTap 的 `history`（编辑器级全局栈），**无焦点门控**（ProseMirror 只在编辑器聚焦时
 * 才收键，但"聚焦在哪个子编辑器"没有区分）与**子编辑器隔离**。本模块把这两条判据写成纯核：
 * 调用方据此决定 Ctrl+Z 是"撤销文档"还是"交给子编辑器"还是"什么都不做"。
 */

/** 光标当前落在哪里——决定 Ctrl+Z 的归属。 */
export type UndoFocus =
  | { kind: 'document' }
  | { kind: 'subEditor'; editor: 'code' | 'math' | 'mermaid' }
  | { kind: 'outside' };

export type UndoDisposition =
  /** 撤销文档（编辑器自己的 history）。 */
  | 'undo-document'
  /** 交给内嵌子编辑器——它有自己的栈，文档不动。 */
  | 'delegate'
  /** 焦点不在编辑器 ⇒ 完全无效。 */
  | 'ignore';

/**
 * Ctrl+Z 该去哪。
 * - 焦点在子编辑器里 ⇒ `delegate`（官方那层隔离：文档不撤销）；
 * - 焦点不在编辑器 ⇒ `ignore`（官方实测"连按 7 次零变化"）；
 * - 焦点在正文 ⇒ `undo-document`。
 */
export function undoDisposition(focus: UndoFocus): UndoDisposition {
  if (focus.kind === 'subEditor') return 'delegate';
  if (focus.kind === 'outside') return 'ignore';
  return 'undo-document';
}

/**
 * 官方那四条实测的"计步"模型：一次输入会话（连续打字）合并成 1 步，一次结构动作（面板建块）
 * 也算 1 步。本地 ProseMirror 的 history 用时间窗合并，本函数把"该合成几步"这件事说出来。
 */
export interface UndoStepInput {
  /** 输入会话里的字符数（0＝不是打字，是结构动作）。 */
  typedCharacters: number;
  /** 该动作是否可撤销（`undoable: false` 的动作不入栈，如 G655 的 undo/redo 自身）。 */
  undoable: boolean;
}

/** 这一笔该记几步。不可撤销 ⇒ 0 步；一次打字会话（不论几个字符）⇒ 1 步；结构动作 ⇒ 1 步。 */
export function undoStepsFor(input: UndoStepInput): number {
  if (!input.undoable) return 0;
  return 1;
}
