import { describe, expect, it } from 'vitest';

import { indentRunOf, selectionRunOf } from './indent-run';

const rows = (...indents: number[]): number[] => indents;

describe('indentRunOf', () => {
  it('takes the block plus every deeper following sibling', () => {
    // 0 1 1 2 0 ⇒ the run starting at 0 covers indexes 0..3.
    expect(indentRunOf(rows(0, 1, 1, 2, 0), 0)).toEqual({ start: 0, end: 4 });
  });

  it('stops at the first sibling that is not deeper', () => {
    expect(indentRunOf(rows(0, 1, 0, 1), 0)).toEqual({ start: 0, end: 2 });
    expect(indentRunOf(rows(1, 1, 1), 0)).toEqual({ start: 0, end: 1 });
  });

  it('a leaf block is a run of one', () => {
    expect(indentRunOf(rows(0, 0, 0), 1)).toEqual({ start: 1, end: 2 });
    expect(indentRunOf(rows(0, 2, 0), 1)).toEqual({ start: 1, end: 2 });
  });

  it('an out-of-range index yields an empty run', () => {
    expect(indentRunOf(rows(0, 1), 5)).toEqual({ start: 5, end: 5 });
    expect(indentRunOf([], 0)).toEqual({ start: 0, end: 0 });
  });

  // G660：显式 `null` 的层级行既不算子树、也不切断子树；没有缩进槽的块类型（`undefined`）
  // 断在哪里，因为它根本不能被嵌进缩进段。
  it('passes an explicit null row without counting it or ending the run', () => {
    expect(indentRunOf([0, 1, null, 1, 0], 0)).toEqual({ start: 0, end: 4 });
  });

  it('ends at a block type that has no indent slot at all', () => {
    expect(indentRunOf([0, 1, undefined, 1], 0)).toEqual({ start: 0, end: 2 });
  });

  it('reads a missing base level as zero (the official `Aw` rule)', () => {
    expect(indentRunOf([null, 1, 0], 0)).toEqual({ start: 0, end: 2 });
    expect(indentRunOf([undefined, 1], 0)).toEqual({ start: 0, end: 2 });
  });
});

describe('selectionRunOf', () => {
  it('spans from the first block of the head to the last block of the tail', () => {
    // 0 1 1 0 1 2 ⇒ head at 1 (its run 1..3), tail at 4 (its run 4..6).
    expect(selectionRunOf(rows(0, 1, 1, 0, 1, 2), 1, 4)).toEqual({ start: 1, end: 6 });
  });

  it('is symmetric in its two ends', () => {
    expect(selectionRunOf(rows(0, 1, 1, 2), 0, 1)).toEqual(selectionRunOf(rows(0, 1, 1, 2), 1, 0));
  });

  it('a selection inside one block is that block\u2019s run', () => {
    expect(selectionRunOf(rows(0, 1, 2, 0), 1, 1)).toEqual({ start: 1, end: 3 });
  });
});
