import { describe, expect, it } from 'vitest';

import { taskRowKeyAction } from './task-row-key';

// G1574: the focused task row toggles with Space or Ctrl/⌘-Alt-T.
describe('task row keyboard action (G1574)', () => {
  it('toggles on Space', () => {
    expect(taskRowKeyAction({ key: ' ' })).toBe('toggle');
  });

  it('toggles on Ctrl/Cmd + Alt + T only', () => {
    expect(taskRowKeyAction({ key: 't', ctrlKey: true, altKey: true })).toBe('toggle');
    expect(taskRowKeyAction({ key: 'T', metaKey: true, altKey: true })).toBe('toggle');
    expect(taskRowKeyAction({ key: 't', ctrlKey: true })).toBeNull();
    expect(taskRowKeyAction({ key: 't', ctrlKey: true, altKey: true, shiftKey: true })).toBe('cancel');
  });

  it('maps the task-row chords (G1603)', () => {
    expect(taskRowKeyAction({ key: '/', ctrlKey: true })).toBe('toggle');
    expect(taskRowKeyAction({ key: 's', ctrlKey: true, shiftKey: true })).toBe('date');
    expect(taskRowKeyAction({ key: 'd', ctrlKey: true, shiftKey: true })).toBe('deadline');
    expect(taskRowKeyAction({ key: 's', ctrlKey: true, altKey: true })).toBe('schedule-today');
  });

  it('ignores other keys', () => {
    expect(taskRowKeyAction({ key: 'Enter' })).toBeNull();
  });
});
