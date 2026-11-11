import { describe, expect, it } from 'vitest';

import { EMPTY_UNDO, UNDO_DEPTH, pushUndo, takeRedo, takeUndo, type UndoEntry } from './undo-stack';

const entry = (label: string): UndoEntry => ({ label, undo: () => {}, redo: () => {} });

// G727 —— 任务视图的 `Ctrl-Z` / `Ctrl-Shift-Z` 历史。
describe('task view undo stack (G727)', () => {
  it('undoes the most recent entry first', () => {
    let state = pushUndo(pushUndo(EMPTY_UNDO, entry('a')), entry('b'));
    const first = takeUndo(state);
    expect(first.entry?.label).toBe('b');
    const second = takeUndo(first.state);
    expect(second.entry?.label).toBe('a');
    expect(takeUndo(second.state).entry).toBeNull();
  });

  it('redo replays what undo took, most recent first', () => {
    const state = pushUndo(pushUndo(EMPTY_UNDO, entry('a')), entry('b'));
    const undone = takeUndo(state);
    const redone = takeRedo(undone.state);
    expect(redone.entry?.label).toBe('b');
    expect(takeRedo(undone.state).entry?.label).toBe('b');
  });

  it('a new action clears the redo branch', () => {
    const undone = takeUndo(pushUndo(EMPTY_UNDO, entry('a')));
    expect(undone.state.future).toHaveLength(1);
    const after = pushUndo(undone.state, entry('b'));
    expect(after.future).toHaveLength(0);
    expect(takeRedo(after).entry).toBeNull();
  });

  it('keeps only the newest UNDO_DEPTH steps', () => {
    let state = EMPTY_UNDO;
    for (let i = 0; i < UNDO_DEPTH + 5; i += 1) state = pushUndo(state, entry(String(i)));
    expect(state.past).toHaveLength(UNDO_DEPTH);
    expect(state.past[0].label).toBe('5');
    expect(state.past[state.past.length - 1].label).toBe(String(UNDO_DEPTH + 4));
  });

  it('returns the same state when there is nothing to take', () => {
    expect(takeUndo(EMPTY_UNDO).state).toBe(EMPTY_UNDO);
    expect(takeRedo(EMPTY_UNDO).state).toBe(EMPTY_UNDO);
  });
});
