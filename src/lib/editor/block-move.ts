import type { Node } from '@tiptap/pm/model';
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';

/**
 * `⌥↑↓` / `⌥↖↘` — the collected block-movement keys (`keyboard.md` 表 B).
 *
 * The block that moves is the top-level child holding the selection. The replacement spans only
 * the two children involved (or the run from the block to its destination for top/bottom),
 * because a whole-document insert in a collaborative session would replay every node through Yjs
 * when only two of them changed.
 */

export type MoveTarget = 'up' | 'down' | 'top' | 'bottom';

export function topLevelIndexOf(doc: Node, pos: number): number {
  if (doc.childCount === 0) return -1;
  const end = doc.content.size;
  if (pos >= end) return doc.childCount - 1;

  let offset = 0;
  for (let index = 0; index < doc.childCount; index += 1) {
    const childEnd = offset + doc.child(index).nodeSize;
    if (pos < childEnd) return index;
    offset = childEnd;
  }
  return -1;
}

/** Opening position of a top-level block, in document coordinates. */
export function topLevelStart(doc: Node, index: number): number {
  let start = 0;
  for (let i = 0; i < index && i < doc.childCount; i += 1) start += doc.child(i).nodeSize;
  return start;
}

export function buildBlockMove(state: EditorState, target: MoveTarget): Transaction | null {
  const { doc, selection } = state;
  const index = topLevelIndexOf(doc, selection.from);
  if (index < 0) return null;

  const next =
    target === 'up'
      ? index - 1
      : target === 'down'
        ? index + 1
        : target === 'top'
          ? 0
          : doc.childCount - 1;
  if (next === index || next < 0 || next >= doc.childCount) return null;

  const children: Node[] = [];
  const offsets: number[] = [];
  let running = 0;
  for (let i = 0; i < doc.childCount; i += 1) {
    offsets.push(running);
    running += doc.child(i).nodeSize;
    children.push(doc.child(i));
  }

  const [moved] = children.splice(index, 1);
  children.splice(next, 0, moved);

  const start = Math.min(index, next);
  const end = Math.max(index, next) + 1;
  // `replaceWith` takes a fragment; `replace` takes a Slice, and handing it a fragment leaves
  // `openStart` undefined — the transform then dies with "Inconsistent open depths".
  const tr = state.tr.replaceWith(
    offsets[start],
    offsets[end - 1] + doc.child(end - 1).nodeSize,
    children.slice(start, end),
  );

  // Land the caret where the block ended up. `offsets` still describes the *original* order, so
  // the destination has to be summed from the arrangement that now holds.
  let movedStart = 0;
  for (let i = 0; i < next; i += 1) movedStart += children[i].nodeSize;
  return tr.setSelection(TextSelection.near(tr.doc.resolve(movedStart + 1))).scrollIntoView();
}
