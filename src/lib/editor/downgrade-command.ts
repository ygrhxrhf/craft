import type { Node } from '@tiptap/pm/model';
import type { EditorState, Transaction } from '@tiptap/pm/state';

import { flattenDowngrade, type FlattenRow } from './downgrade-flatten';

/**
 * G278: turning a block into Body text is a **downgrade**, and the official downgrade flattens the
 * block's indented children up to its own level rather than deleting them or leaving them nested.
 * The pure ordering rule lives in `downgrade-flatten.ts`; this is the ProseMirror half that reads
 * the document and writes the new indent attributes.
 *
 * Only indent attributes change here — the style change (heading → paragraph) is the caller's, so
 * this command composes with any "make it Body" action.
 */

function indentOf(node: Node): number {
  const raw = node.attrs?.indent;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

/**
 * A transaction that lifts the indented children of the top-level block at `index` up to that
 * block's level. Returns `null` when there is nothing to lift (the block has no deeper siblings).
 */
export function buildDowngradeFlatten(state: EditorState, index: number): Transaction | null {
  const { doc } = state;
  if (index < 0 || index >= doc.childCount) return null;

  const rows: FlattenRow[] = [];
  const positions: number[] = [];
  let pos = 0;
  for (let i = 0; i < doc.childCount; i += 1) {
    const node = doc.child(i);
    rows.push({ blockId: String(i), indent: indentOf(node), downgraded: i === index });
    positions.push(pos);
    pos += node.nodeSize;
  }

  const flattened = flattenDowngrade(rows);
  const tr = state.tr;
  let changed = false;
  flattened.forEach((row, i) => {
    if (row.indent === rows[i].indent) return;
    const node = doc.child(i);
    tr.setNodeMarkup(positions[i], undefined, { ...node.attrs, indent: row.indent });
    changed = true;
  });

  return changed ? tr : null;
}
