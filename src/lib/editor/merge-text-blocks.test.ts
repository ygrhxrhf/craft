import { describe, expect, it } from 'vitest';

import { canMergeTextBlocks, mergeStyleWinner, type MergeSide } from './merge-text-blocks';

const side = (patch: Partial<MergeSide> = {}): MergeSide => ({
  textContent: '甲',
  isListItem: false,
  childBlocks: 0,
  ...patch,
});

describe('mergeStyleWinner (G585)', () => {
  it('rule 1: a previous block with no textContent at all loses', () => {
    expect(mergeStyleWinner(side({ textContent: null }), side())).toBe('next');
  });

  it('rule 2: a next block with children beats a childless previous block', () => {
    expect(mergeStyleWinner(side({ childBlocks: 0 }), side({ childBlocks: 2 }))).toBe('next');
  });

  it('rule 2 does not fire when the previous block also has children', () => {
    expect(mergeStyleWinner(side({ childBlocks: 1 }), side({ childBlocks: 2 }))).toBe('previous');
  });

  it('rule 3: a previous block with text wins', () => {
    expect(mergeStyleWinner(side({ textContent: '有字' }), side({ textContent: '' }))).toBe('previous');
  });

  it('rule 3: a previous list item wins even when its text is empty', () => {
    expect(mergeStyleWinner(side({ textContent: '', isListItem: true }), side())).toBe('previous');
  });

  it('rule 3: a previous block with children wins even when its text is empty', () => {
    expect(mergeStyleWinner(side({ textContent: '', childBlocks: 1 }), side())).toBe('previous');
  });

  it('rule 4: two empty plain blocks fall through to the next block', () => {
    expect(mergeStyleWinner(side({ textContent: '' }), side({ textContent: '' }))).toBe('next');
  });

  it('the rules short-circuit in order', () => {
    // Rule 1 fires before rule 2 could: no textContent loses even if it has children.
    expect(mergeStyleWinner(side({ textContent: null, childBlocks: 3 }), side())).toBe('next');
  });
});

describe('canMergeTextBlocks (G585)', () => {
  const ok = {
    previousExists: true,
    nextExists: true,
    previousIsText: true,
    nextIsText: true,
    parentMergeable: true,
  };

  it('allows the normal case', () => {
    expect(canMergeTextBlocks(ok)).toEqual({ ok: true });
  });

  it('is a silent no-op when a block is missing', () => {
    expect(canMergeTextBlocks({ ...ok, previousExists: false })).toEqual({ ok: false, reason: 'missing-block' });
    expect(canMergeTextBlocks({ ...ok, nextExists: false })).toEqual({ ok: false, reason: 'missing-block' });
  });

  it('is a silent no-op when either side is not a text block', () => {
    expect(canMergeTextBlocks({ ...ok, nextIsText: false })).toEqual({ ok: false, reason: 'non-text-block' });
  });

  it('reports the InconsistentDocument case the official logs', () => {
    expect(canMergeTextBlocks({ ...ok, parentMergeable: false })).toEqual({ ok: false, reason: 'InconsistentDocument' });
  });
});
