import type { EditorState, Transaction } from '@tiptap/pm/state';

import { topLevelStart } from './block-move';

/**
 * 把第 `index` 个顶层块落成卡片并写入底色：已经是卡片就改属性，否则整块裹进 `cardBlock`。
 * `cardBlock` 的 content 是 `block+`，所以普通段落、表格都能原样装进去。
 */
export function buildCardBackground(
  state: EditorState,
  index: number,
  bgColor: string,
): Transaction | null {
  const card = state.schema.nodes.cardBlock;
  if (!card) return null;
  if (index < 0 || index >= state.doc.childCount) return null;
  const node = state.doc.child(index);
  const start = topLevelStart(state.doc, index);
  if (node.type === card) {
    return state.tr.setNodeMarkup(start, undefined, { ...node.attrs, bgColor });
  }
  return state.tr.replaceWith(start, start + node.nodeSize, card.create({ bgColor }, node));
}

export function applyCardBackground(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  bgColor: string,
): boolean {
  const tr = buildCardBackground(state, index, bgColor);
  if (!tr) return false;
  dispatch(tr);
  return true;
}
