import { describe, expect, it } from 'vitest';
import { deleteStepFor, type DeleteContext } from './forward-delete';

const ctx = (over: Partial<DeleteContext> = {}): DeleteContext => ({
  collapsed: true,
  atBlockEnd: true,
  blockEmpty: false,
  nextIsText: true,
  hasNext: true,
  ...over,
});

describe('deleteStepFor (G632)', () => {
  it('does nothing unless the caret is collapsed at the block end', () => {
    expect(deleteStepFor(ctx({ collapsed: false }))).toBe('none');
    expect(deleteStepFor(ctx({ atBlockEnd: false }))).toBe('none');
  });

  it('an empty block deletes itself and selects the next one', () => {
    expect(deleteStepFor(ctx({ blockEmpty: true }))).toBe('delete-self');
  });

  it('merges forward when the next block is text', () => {
    expect(deleteStepFor(ctx({ nextIsText: true }))).toBe('join-forward');
  });

  it('does nothing on the last block', () => {
    expect(deleteStepFor(ctx({ hasNext: false }))).toBe('none');
    // 末块即便是空的也不删（没有"下一块"可落选区）。
    expect(deleteStepFor(ctx({ hasNext: false, blockEmpty: true }))).toBe('none');
  });

  it('does not merge into a non-text next block', () => {
    expect(deleteStepFor(ctx({ nextIsText: false }))).toBe('none');
  });

  // ★ 与 Backspace 的关键差别：Delete **没有** list/indent/decoration 退档链。
  it('has no format-step branch — those belong to Backspace alone', () => {
    const steps = new Set(
      [
        ctx({ blockEmpty: true }),
        ctx({ nextIsText: true }),
        ctx({ nextIsText: false }),
        ctx({ hasNext: false }),
      ].map(deleteStepFor),
    );
    expect([...steps].every((s) => s === 'none' || s === 'delete-self' || s === 'join-forward')).toBe(true);
  });
});
