import { describe, expect, it } from 'vitest';

import { isEmptyBlock, mergeCaretIndex, nextBackspaceStep, nextFormatStep } from './format-downgrade';

// G570: the three-step chain, in order, first applicable step wins.
describe('the format downgrade chain', () => {
  it('steps indentation first', () => {
    expect(nextFormatStep({ indentLevel: 2, inList: true, decorated: true })).toBe('indent');
  });

  it('then leaves a list', () => {
    expect(nextFormatStep({ indentLevel: 0, inList: true, decorated: true })).toBe('list');
  });

  it('then clears decorations', () => {
    expect(nextFormatStep({ indentLevel: 0, inList: false, decorated: true })).toBe('decoration');
  });

  it('returns null when nothing is left to step down from', () => {
    expect(nextFormatStep({ indentLevel: 0, inList: false, decorated: false })).toBeNull();
  });
});

// G577: "completely empty" counts text and atomic inlines, and any child block disqualifies it.
describe('the empty-block test', () => {
  it('is empty only with no text, no atomic inline and no child block', () => {
    expect(isEmptyBlock({ textLength: 0, atomicInlines: 0, childBlocks: 0 })).toBe(true);
  });

  it('is not empty with text, an atomic inline, or a child block', () => {
    expect(isEmptyBlock({ textLength: 1, atomicInlines: 0, childBlocks: 0 })).toBe(false);
    expect(isEmptyBlock({ textLength: 0, atomicInlines: 1, childBlocks: 0 })).toBe(false);
    expect(isEmptyBlock({ textLength: 0, atomicInlines: 0, childBlocks: 1 })).toBe(false);
  });
});

// G578: Backspace's six-step chain. Format order is list → indent → decoration (the reverse of
// Enter's), then the four block-level steps.
describe('the Backspace chain', () => {
  const plain = { indentLevel: 0, inList: false, decorated: false };
  const ctx = (patch: Partial<Parameters<typeof nextBackspaceStep>[0]> = {}) => ({
    block: plain,
    blockEmpty: false,
    hasPrevious: true,
    ...patch,
  });

  it('leaves a list before touching indentation, unlike Enter', () => {
    expect(nextBackspaceStep(ctx({ block: { indentLevel: 2, inList: true, decorated: true } }))).toBe('list');
    expect(nextBackspaceStep(ctx({ block: { indentLevel: 2, inList: false, decorated: true } }))).toBe('indent');
    expect(nextBackspaceStep(ctx({ block: { indentLevel: 0, inList: false, decorated: true } }))).toBe('decoration');
  });

  it('deletes an empty first block when there is no previous block', () => {
    expect(nextBackspaceStep(ctx({ hasPrevious: false, blockEmpty: true }))).toBe('delete-self');
  });

  it('does nothing on a non-empty first block with no previous block', () => {
    expect(nextBackspaceStep(ctx({ hasPrevious: false, blockEmpty: false }))).toBeNull();
  });

  it('deletes a previous empty text block', () => {
    expect(nextBackspaceStep(ctx({ previous: { isText: true, empty: true } }))).toBe('delete-previous');
  });

  it('merges into a previous text block', () => {
    expect(nextBackspaceStep(ctx({ previous: { isText: true, empty: false } }))).toBe('merge-into-previous');
  });

  it('selects a non-text previous block when this block is empty', () => {
    expect(nextBackspaceStep(ctx({ blockEmpty: true, previous: { isText: false, empty: false } }))).toBe('select-previous');
    expect(nextBackspaceStep(ctx({ blockEmpty: false, previous: { isText: false, empty: false } }))).toBeNull();
  });

  it('lands the merge caret at the previous block end', () => {
    expect(mergeCaretIndex(7)).toBe(7);
    expect(mergeCaretIndex(null)).toBe(-1);
  });
});
