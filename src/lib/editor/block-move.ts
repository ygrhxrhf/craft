import type { Node } from '@tiptap/pm/model';
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';

import { indentRunOf } from './indent-run';

/**
 * `⌥↑↓` / `⌥↖↘` — the collected block-movement keys (`keyboard.md` 表 B).
 *
 * G279: the unit that moves is the **block together with its indented children**, not a single
 * block. That is exactly `indentRunOf` over the top-level children's `indent` attributes — the run
 * from the block the caret is in to the first following sibling that is not deeper. So a caret on a
 * parent carries the whole subtree, and a caret on a nested child carries only that child's own
 * subtree (`extendWithIndentChildren` reads the anchor, not a fixed partition of the document).
 *
 * The replacement spans only the region the move touches, because a whole-document insert in a
 * collaborative session would replay every node through Yjs when only a couple of them changed.
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

/** The indent level a top-level block carries; list items and others without the attr read as 0. */
function indentOf(node: Node): number {
  const raw = node.attrs?.indent;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

export function buildBlockMove(state: EditorState, target: MoveTarget): Transaction | null {
  const { doc, selection } = state;
  const index = topLevelIndexOf(doc, selection.from);
  if (index < 0) return null;

  const indents = Array.from({ length: doc.childCount }, (_, i) => indentOf(doc.child(i)));
  const unit = indentRunOf(indents, index);
  if (unit.end <= unit.start) return null;

  // `dest` is "insert the unit before original index `dest`".
  let dest: number;
  if (target === 'up') {
    if (unit.start === 0) return null;
    dest = unit.start - 1;
  } else if (target === 'down') {
    if (unit.end >= doc.childCount) return null;
    dest = unit.end + 1;
  } else if (target === 'top') {
    if (unit.start === 0) return null;
    dest = 0;
  } else {
    if (unit.end >= doc.childCount) return null;
    dest = doc.childCount;
  }

  const children: Node[] = [];
  const offsets: number[] = [];
  let running = 0;
  for (let i = 0; i < doc.childCount; i += 1) {
    offsets.push(running);
    running += doc.child(i).nodeSize;
    children.push(doc.child(i));
  }

  const moved = children.splice(unit.start, unit.end - unit.start);
  // Removing the slice shifts every index at or after `unit.end` left by the unit's length.
  const insertAt = dest > unit.end ? dest - (unit.end - unit.start) : dest;
  children.splice(insertAt, 0, ...moved);

  const lo = Math.min(unit.start, dest);
  const hi = Math.max(unit.end, dest);
  // `replaceWith` takes a fragment; `replace` takes a Slice, and handing it a fragment leaves
  // `openStart` undefined — the transform then dies with "Inconsistent open depths".
  const tr = state.tr.replaceWith(offsets[lo], offsets[hi] ?? doc.content.size, children.slice(lo, hi));

  // Land the caret inside the block that moved: step past the blocks now ahead of it in the region.
  let caretPos = offsets[lo];
  for (let i = lo; i < insertAt; i += 1) caretPos += children[i].nodeSize;
  return tr.setSelection(TextSelection.near(tr.doc.resolve(caretPos + 1))).scrollIntoView();
}
