import { describe, expect, it } from 'vitest';

import {
  initialTextEditState,
  restoreTextEdit,
  startTextEdit,
  stopTextEdit,
} from './text-edit-state';

/**
 * G601: stop/restore are a pair, and the two switches on `stopTextEdit` are independent — an empty
 * block is removed only when allowed, and a backup is kept only when asked.
 */
describe('the text-edit state machine (G601)', () => {
  const entered = startTextEdit(initialTextEditState(), { blockId: 'b1', anchor: 3, head: 5 });

  it('records a backup on entering', () => {
    expect(entered.editingBlockId).toBe('b1');
    expect(entered.backup).toEqual({ blockId: 'b1', anchor: 3, head: 5 });
  });

  it('removes an empty block only when allowToBeRemovedWhenEmpty is set', () => {
    const kept = stopTextEdit(entered, { allowToBeRemovedWhenEmpty: false, backupSelection: true, blockEmpty: true });
    expect(kept.removeBlock).toBe(false);
    const removed = stopTextEdit(entered, { allowToBeRemovedWhenEmpty: true, backupSelection: true, blockEmpty: true });
    expect(removed.removeBlock).toBe(true);
  });

  it('never removes a non-empty block', () => {
    const result = stopTextEdit(entered, { allowToBeRemovedWhenEmpty: true, backupSelection: true, blockEmpty: false });
    expect(result.removeBlock).toBe(false);
  });

  it('keeps the backup only when backupSelection is set', () => {
    const kept = stopTextEdit(entered, { allowToBeRemovedWhenEmpty: false, backupSelection: true, blockEmpty: false });
    expect(kept.state.backup).toEqual(entered.backup);
    const dropped = stopTextEdit(entered, { allowToBeRemovedWhenEmpty: false, backupSelection: false, blockEmpty: false });
    expect(dropped.state.backup).toBeNull();
  });

  it('leaves edit mode either way', () => {
    const result = stopTextEdit(entered, { allowToBeRemovedWhenEmpty: false, backupSelection: true, blockEmpty: false });
    expect(result.state.editingBlockId).toBeNull();
  });

  it('restores the backup selection on the way back in', () => {
    const stopped = stopTextEdit(entered, { allowToBeRemovedWhenEmpty: false, backupSelection: true, blockEmpty: false });
    const restored = restoreTextEdit(stopped.state);
    expect(restored.selection).toEqual({ blockId: 'b1', anchor: 3, head: 5 });
    expect(restored.state.editingBlockId).toBe('b1');
  });

  it('does not invent a selection when there is no backup', () => {
    expect(restoreTextEdit(initialTextEditState()).selection).toBeNull();
  });
});
