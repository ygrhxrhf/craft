import type { Node } from '@tiptap/pm/model';
import type { EditorState, Transaction } from '@tiptap/pm/state';

/**
 * G197「组合 / 取消组合」。官方把多块归成一组是块级一等操作；本地没有独立的 group 节点，
 * 容器形状就是 `cardBlock`（插入面板的「卡片」与块菜单的「转换为卡片」共用它），所以组合＝
 * 包进卡片、取消组合＝把卡片的子块提回顶层。
 */

const CARD = 'cardBlock';

function topLevelIndexRange(state: EditorState): { first: number; last: number } | null {
  const { $from, $to } = state.selection;
  if ($from.depth === 0 || $to.depth === 0) {
    // 空文档或选区贴到 doc 两端：没有可归的块。
    if (state.doc.childCount === 0) return null;
    const anchor = $from.depth === 0 ? $from.index(0) : 0;
    const tail = $to.depth === 0 ? Math.max(0, $to.index(0) - 1) : $to.index(0);
    return anchor <= tail ? { first: anchor, last: tail } : null;
  }
  const first = $from.index(0);
  const last = Math.max(first, $to.index(0));
  return { first, last };
}

function positionOfIndex(doc: EditorState['doc'], index: number): number {
  let pos = 0;
  for (let child = 0; child < index; child += 1) pos += doc.child(child).nodeSize;
  return pos;
}

/** 选区是否已经在卡片里（官方不允许卡片套卡片）。 */
function insideCard(state: EditorState): boolean {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === CARD) return true;
  }
  return false;
}

/** 取消组合什么时候可点：光标在卡片里。 */
export function canUngroup(state: EditorState): boolean {
  return insideCard(state);
}

export function canGroup(state: EditorState): boolean {
  const card = state.schema.nodes[CARD];
  if (!card) return false;
  if (insideCard(state)) return false;
  const range = topLevelIndexRange(state);
  return Boolean(range && range.last > range.first);
}

/** 把选区触及的顶层块包进一张卡片。返回是否真的动了事务。 */
export function applyGroup(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const card = state.schema.nodes[CARD];
  if (!canGroup(state) || !card) return false;
  const range = topLevelIndexRange(state)!;
  const nodes: Node[] = [];
  for (let index = range.first; index <= range.last; index += 1) nodes.push(state.doc.child(index));
  const start = positionOfIndex(state.doc, range.first);
  const end = start + nodes.reduce((size, node) => size + node.nodeSize, 0);
  if (!dispatch) return true;
  dispatch(state.tr.replaceWith(start, end, card.create(null, nodes)));
  return true;
}

/** G1588：块选择态里选中的下标集合 → 一次性包进卡片（跨态的成组入口）。 */
export function applyGroupIndices(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  indices: readonly number[],
): boolean {
  const card = state.schema.nodes[CARD];
  if (!card) return false;
  const sorted = [...new Set(indices)].sort((a, b) => a - b).filter((index) => index >= 0 && index < state.doc.childCount);
  if (sorted.length < 2) return false;
  const nodes: Node[] = sorted.map((index) => state.doc.child(index));
  const start = positionOfIndex(state.doc, sorted[0]);
  const end = start + nodes.reduce((size, node) => size + node.nodeSize, 0);
  if (!dispatch) return true;
  dispatch(state.tr.replaceWith(start, end, card.create(null, nodes)));
  return true;
}

/** 取消组合：把光标所在卡片的子块提回顶层，卡片本身消失。 */
export function applyUngroup(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== CARD) continue;
    if (!dispatch) return true;
    dispatch(state.tr.replaceWith($from.before(depth), $from.after(depth), node.content));
    return true;
  }
  return false;
}
