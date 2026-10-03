import type { EditorState, Transaction } from '@tiptap/pm/state';

export const TOGGLE_NODE = 'toggleBlock';

/**
 * Rewrites `open` on every toggle block in the document and returns how many
 * actually moved, so the caller can decline to dispatch an empty change. The
 * walk descends into collapsed parents on purpose: their children are still in
 * the document even though nothing renders them, and stopping at a closed node
 * is the easy way to miss half the blocks.
 *
 * Only attributes change, so node sizes hold and the positions reported against
 * `state.doc` stay valid for the whole transaction.
 */
export function setOpenOnAllToggles(
  state: EditorState,
  tr: Transaction,
  open: boolean,
): number {
  let changed = 0;
  state.doc.descendants((node, pos) => {
    if (node.type.name === TOGGLE_NODE && node.attrs.open !== open) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, open });
      changed += 1;
    }
    return true;
  });
  return changed;
}
