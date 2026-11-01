import { describe, expect, it } from 'vitest';

import { isEmptyBlock, nextFormatStep } from './format-downgrade';

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
