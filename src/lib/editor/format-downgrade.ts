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
 * G577: whether a block counts as "completely empty". Text content is not enough on its own — an
 * atomic inline (mention, emoji, inline math) also makes the block non-empty.
 */
export function isEmptyBlock(input: {
  textLength: number;
  atomicInlines: number;
  childBlocks: number;
}): boolean {
  if (input.childBlocks > 0) return false;
  if (input.textLength > 0) return false;
  return input.atomicInlines === 0;
}
