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

/**
 * The state a "toggle all toggles" press should land on: open everything when any toggle is
 * closed, close everything once they are all open, and null when the document has no toggles
 * (the key then stays inert — the official binding does not fire on every press).
 */
export function nextOpenForAllToggles(state: EditorState): boolean | null {
  let found = false;
  let anyClosed = false;
  state.doc.descendants((node) => {
    if (node.type.name === TOGGLE_NODE) {
      found = true;
      if (node.attrs.open !== true) anyClosed = true;
    }
    return true;
  });
  return found ? anyClosed : null;
}

/**
 * G1590: pressing Enter with the caret in a toggle's summary must add a child block
 * inside the toggle, not split the summary out and dissolve the toggle.
 */
export function toggleSummaryTarget(state: EditorState): {
  togglePos: number;
  insertPos: number;
  selectPos: number;
} | null {
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return null;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== TOGGLE_NODE) continue;
    const start = $from.before(depth);
    const first = node.firstChild;
    if (!first) return null;
    const summaryEnd = start + 1 + first.nodeSize;
    if ($from.pos < summaryEnd && $from.pos >= start + 1) {
      const insertPos = start + node.nodeSize - 1;
      return { togglePos: start, insertPos, selectPos: insertPos + 1 };
    }
    return null;
  }
  return null;
}
