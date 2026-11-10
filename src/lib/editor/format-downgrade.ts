/**
 * G570/G577/G578: the three-step "step down one format level" chain. Enter and Backspace both
 * walk it in the same order, and each step only fires when the one above it does not apply:
 *
 *   1. indentation above zero → indent down one
 *   2. a list style → leave the list
 *   3. block decorations or a colour → clear them
 *
 * Locally a block carries none of these as block attributes except indentation and list membership,
 * so the chain is expressed over the two that exist; the shape is what the callers agree on, which
 * is what keeps Enter and Backspace from drifting apart.
 */

export interface BlockFormatState {
  /** Indentation level, 0 when the block is not indented. */
  indentLevel: number;
  /** Whether the block is a list item (bullet/ordered/task). */
  inList: boolean;
  /** Whether the block carries a decoration or colour. */
  decorated: boolean;
}

export type FormatStep = 'indent' | 'list' | 'decoration';

/**
 * The first step that applies, or null when nothing is left to step down from — at that point the
 * caller should fall through to its normal behaviour (split for Enter, merge for Backspace).
 */
export function nextFormatStep(state: BlockFormatState): FormatStep | null {
  if (state.indentLevel > 0) return 'indent';
  if (state.inList) return 'list';
  if (state.decorated) return 'decoration';
  return null;
}

/**
 * G570: the official decoration step clears a **numeric** decoration level
 * (`{block:0, focus:0}`) plus a colour. Locally the decoration is carried by three attributes —
 * `focusColor` (the "focus" decoration), `backgroundColor` (the "block" decoration) and `textColor`
 * — so this reports whether any is set, which is what the chain's third step consumes.
 */
export function hasDecoration(attrs: { focusColor?: unknown; backgroundColor?: unknown; textColor?: unknown } | null | undefined): boolean {
  if (!attrs) return false;
  const focus = attrs.focusColor;
  const block = attrs.backgroundColor;
  const text = attrs.textColor;
  return Boolean(
    (typeof focus === 'string' && focus) ||
      (typeof block === 'string' && block) ||
      (typeof text === 'string' && text),
  );
}
export function isEmptyBlock(input: {
  textLength: number;
  atomicInlines: number;
  childBlocks: number;
}): boolean {
  if (input.childBlocks > 0) return false;
  if (input.textLength > 0) return false;
  return input.atomicInlines === 0;
}

/**
 * G578: Backspace's **six-step chain** (`Dsn`). It walks the same three format steps Enter does
 * (list → indent → decoration), and only when none applies does it move to the block itself:
 *
 *   1. leave the list
 *   2. reduce indentation
 *   3. clear decorations and colour
 *   4. no previous block and this block is empty → delete self, clear the selection
 *   5. the previous block is an empty text block → delete the previous block
 *   6. the previous block is text → merge this block into it (caret lands at the previous end)
 *   7. the previous block is non-text and this block is empty → delete self, select the previous
 *
 * The local editor has the first three as `nextFormatStep`; steps 4–7 are what the ledger records as
 * missing (local merge is ProseMirror's `joinBackward`, which does none of them). Modelling the
 * whole chain here is what lets the caller drive it explicitly instead of inheriting the default.
 */
export type BackspaceStep =
  | 'list'
  | 'indent'
  | 'decoration'
  | 'delete-self'
  | 'delete-previous'
  | 'merge-into-previous'
  | 'select-previous';

export interface BackspaceContext {
  /** Format state of the block the caret is in. */
  block: BlockFormatState;
  /** Whether the block is completely empty (`isEmptyBlock`). */
  blockEmpty: boolean;
  /** Whether a previous sibling block exists. */
  hasPrevious: boolean;
  /** The previous block's kind, when one exists. */
  previous?: { isText: boolean; empty: boolean };
}

/** The first Backspace step that applies, in the official order. */
export function nextBackspaceStep(ctx: BackspaceContext): BackspaceStep | null {
  // Steps 1–3: the format chain. Dedent runs before leaving the list — G907's on-screen reading
  // (★★★) pressed twice on one block and saw indent drop first, then listStyle+taskInfo vanish.
  // That overrides G578's static `Dsn` inference (which read the reverse order); the on-screen
  // reading is the one with executed evidence, so indent wins.
  if (ctx.block.indentLevel > 0) return 'indent';
  if (ctx.block.inList) return 'list';
  if (ctx.block.decorated) return 'decoration';

  // Step 4: no previous block at all — an empty block is deleted, a non-empty one does nothing.
  if (!ctx.hasPrevious) return ctx.blockEmpty ? 'delete-self' : null;

  const previous = ctx.previous ?? { isText: true, empty: false };
  // Step 5: the previous block is an empty text block — remove it.
  if (previous.isText && previous.empty) return 'delete-previous';
  // Step 6: the previous block is text — merge into it, caret at the previous block's end.
  if (previous.isText) return 'merge-into-previous';
  // Step 7: the previous block is non-text and this block is empty — delete self, select previous.
  if (ctx.blockEmpty) return 'select-previous';
  return null;
}

/** The redo caret landing for a merge: the previous block's end (`textSelectionIndex`). */
export function mergeCaretIndex(previousTextLength: number | null | undefined): number {
  return typeof previousTextLength === 'number' ? previousTextLength : -1;
}

/** The node kinds the chain counts as *text* blocks (`paragraph` and `heading`). */
export const TEXT_BLOCK_NAMES: readonly string[] = ['paragraph', 'heading'];

/** The little the chain needs from a sibling node. */
export interface SiblingBlockLike {
  type: { name: string };
  textContent: string;
}

/**
 * G628: the block **before this one among its own siblings**. The official dispatcher reads the
 * container's `subblocks`, so a block nested in a toggle compares against the previous child of
 * that toggle — not against the previous entry of the document's flattened order, which is what
 * a top-level-only lookup hands back.
 *
 * Returns `undefined` when this block is first among its siblings, which is exactly the
 * "no previous sibling" arm of the chain (delete self when empty, do nothing otherwise).
 */
export function previousSibling(
  siblings: readonly SiblingBlockLike[],
  index: number,
): { isText: boolean; empty: boolean } | undefined {
  if (index <= 0 || index >= siblings.length) return undefined;
  const previous = siblings[index - 1];
  const isText = TEXT_BLOCK_NAMES.includes(previous.type.name);
  return { isText, empty: isText && previous.textContent.length === 0 };
}
