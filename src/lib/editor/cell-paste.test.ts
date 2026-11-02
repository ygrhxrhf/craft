import { describe, expect, it } from 'vitest';
import { shouldReplaceCellOnPaste, type CellPasteContext } from './cell-paste';

const ctx = (over: Partial<CellPasteContext> = {}): CellPasteContext => ({
  inCell: true,
  cellNonEmpty: true,
  clipboardText: 'BB',
  ...over,
});

describe('shouldReplaceCellOnPaste (G1602)', () => {
  it('replaces the whole cell when it already has content', () => {
    expect(shouldReplaceCellOnPaste(ctx())).toBe(true);
  });

  it('does not special-case a paste outside a table cell', () => {
    expect(shouldReplaceCellOnPaste(ctx({ inCell: false }))).toBe(false);
  });

  it('an empty cell takes the ordinary insert path', () => {
    expect(shouldReplaceCellOnPaste(ctx({ cellNonEmpty: false }))).toBe(false);
  });

  it('an empty clipboard has nothing to put in', () => {
    expect(shouldReplaceCellOnPaste(ctx({ clipboardText: '' }))).toBe(false);
    expect(shouldReplaceCellOnPaste(ctx({ clipboardText: '   \n  ' }))).toBe(false);
  });
});
