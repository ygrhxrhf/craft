import { describe, expect, it } from 'vitest';

import { nextWordOffset, prevWordOffset, wordJumpMoves } from './word-nav';

// G1553: forward lands on the word end; the jump never leaves the text it was given.
describe('word navigation offsets', () => {
  const text = 'AAA BBB CCC';

  it('forward steps to the end of the next word', () => {
    expect(nextWordOffset(text, 0)).toBe(3);
    expect(nextWordOffset(text, 3)).toBe(7);
    expect(nextWordOffset(text, 7)).toBe(11);
  });

  it('forward at the end stays put', () => {
    expect(nextWordOffset(text, 11)).toBe(11);
  });

  it('backward steps to the start of the previous word', () => {
    expect(prevWordOffset(text, 11)).toBe(8);
    expect(prevWordOffset(text, 8)).toBe(4);
    expect(prevWordOffset(text, 4)).toBe(0);
  });

  it('backward at the start stays put', () => {
    expect(prevWordOffset(text, 0)).toBe(0);
  });

  it('treats a CJK run as one word', () => {
    expect(nextWordOffset('你好世界 abc', 0)).toBe(4);
    expect(prevWordOffset('你好世界 abc', 7)).toBe(5);
  });

  it('reports whether a jump moves, so the caller can still consume the key', () => {
    expect(wordJumpMoves('right', text, 0)).toBe(true);
    expect(wordJumpMoves('right', text, 11)).toBe(false);
    expect(wordJumpMoves('left', text, 0)).toBe(false);
  });
});
