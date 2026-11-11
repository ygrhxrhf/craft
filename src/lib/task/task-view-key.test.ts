import { describe, expect, it } from 'vitest';

import { isEditableTarget, rowNavIndex, taskHistoryKeyAction, taskViewKeyAction } from './task-view-key';

// G727 —— 官方面板「在任务视图中」那半。
describe('task view keyboard action (G727)', () => {
  it('moves between rows with the bare arrows', () => {
    expect(taskViewKeyAction({ key: 'ArrowUp' })).toBe('prev');
    expect(taskViewKeyAction({ key: 'ArrowDown' })).toBe('next');
  });

  it('deletes with Backspace or Delete', () => {
    expect(taskViewKeyAction({ key: 'Backspace' })).toBe('delete');
    expect(taskViewKeyAction({ key: 'Delete' })).toBe('delete');
  });

  it('edits with Enter', () => {
    expect(taskViewKeyAction({ key: 'Enter' })).toBe('edit');
  });

  it('navigates to the block only with Ctrl/Cmd + right arrow', () => {
    expect(taskViewKeyAction({ key: 'ArrowRight', ctrlKey: true })).toBe('navigate-block');
    expect(taskViewKeyAction({ key: 'ArrowRight', metaKey: true })).toBe('navigate-block');
    expect(taskViewKeyAction({ key: 'ArrowRight' })).toBeNull();
    expect(taskViewKeyAction({ key: 'ArrowRight', ctrlKey: true, shiftKey: true })).toBeNull();
    expect(taskViewKeyAction({ key: 'ArrowRight', ctrlKey: true, altKey: true })).toBeNull();
  });

  it('leaves every other chord to the row keys', () => {
    expect(taskViewKeyAction({ key: '/' , ctrlKey: true })).toBeNull();
    expect(taskViewKeyAction({ key: 'z', ctrlKey: true })).toBeNull();
    expect(taskViewKeyAction({ key: 'ArrowUp', altKey: true })).toBeNull();
    expect(taskViewKeyAction({ key: 'a' })).toBeNull();
  });
});

describe('view-level history keys (G727)', () => {
  it('maps Ctrl/Cmd-Z and Ctrl/Cmd-Shift-Z', () => {
    expect(taskHistoryKeyAction({ key: 'z', ctrlKey: true })).toBe('undo');
    expect(taskHistoryKeyAction({ key: 'Z', metaKey: true, shiftKey: true })).toBe('redo');
  });

  it('ignores the rest', () => {
    expect(taskHistoryKeyAction({ key: 'z' })).toBeNull();
    expect(taskHistoryKeyAction({ key: 'z', ctrlKey: true, altKey: true })).toBeNull();
    expect(taskHistoryKeyAction({ key: 'y', ctrlKey: true })).toBeNull();
  });
});

describe('row navigation index (G727)', () => {
  it('stops at both ends instead of wrapping', () => {
    expect(rowNavIndex(0, 3, 'prev')).toBeNull();
    expect(rowNavIndex(2, 3, 'next')).toBeNull();
  });

  it('walks one neighbour', () => {
    expect(rowNavIndex(1, 3, 'prev')).toBe(0);
    expect(rowNavIndex(1, 3, 'next')).toBe(2);
  });

  it('rejects an out-of-range current row', () => {
    expect(rowNavIndex(-1, 3, 'next')).toBeNull();
    expect(rowNavIndex(3, 3, 'prev')).toBeNull();
  });
});

describe('editable-target guard (G727)', () => {
  it('lets the shortcuts through everywhere but form fields', () => {
    expect(isEditableTarget({ tagName: 'DIV' })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget({ tagName: 'input' })).toBe(true);
    expect(isEditableTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditableTarget({ tagName: 'select' })).toBe(true);
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });
});
