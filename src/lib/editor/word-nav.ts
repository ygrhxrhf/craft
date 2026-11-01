/**
 * G1553: `Mod+←/→` is word-level navigation and the official build **consumes the key**.
 * Two details differ from the browser default, and both are what the ledger measured:
 *
 * 1. Forward lands on the **end** of the next word (`0→3→7` for `AAA BBB CCC`), not the start.
 * 2. It never leaves the block — at the end of a block the caret stays put.
 *
 * Word characters are ASCII letters/digits plus CJK ideographs, so a Chinese run counts as one
 * word rather than one word per character.
 */

const WORD_CHAR = /[\p{L}\p{N}]/u;

function isWordChar(char: string): boolean {
  return WORD_CHAR.test(char);
}

/** The offset the forward jump lands on: the end of the current word run, or of the next one. */
export function nextWordOffset(text: string, offset: number): number {
  let index = Math.min(Math.max(offset, 0), text.length);
  // Standing inside a word: the jump ends that word (`0→3` for `AAA BBB CCC`).
  if (index < text.length && isWordChar(text[index])) {
    while (index < text.length && isWordChar(text[index])) index += 1;
    return index;
  }
  // In a gap: cross it, then take the whole next word run.
  while (index < text.length && !isWordChar(text[index])) index += 1;
  while (index < text.length && isWordChar(text[index])) index += 1;
  return index;
}

/** The offset the backward jump lands on: the start of the previous word run, or 0. */
export function prevWordOffset(text: string, offset: number): number {
  let index = Math.min(Math.max(offset, 0), text.length);
  while (index > 0 && !isWordChar(text[index - 1])) index -= 1;
  while (index > 0 && isWordChar(text[index - 1])) index -= 1;
  return index;
}

/** Whether the jump actually moves; the caller consumes the key either way (official behaviour). */
export function wordJumpMoves(direction: 'left' | 'right', text: string, offset: number): boolean {
  const target = direction === 'right' ? nextWordOffset(text, offset) : prevWordOffset(text, offset);
  return target !== offset;
}
