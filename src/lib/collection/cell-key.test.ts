import { describe, expect, it } from 'vitest';
import { cellKeyAction } from './cell-key';

describe('cellKeyAction (G466)', () => {
  it('commits on a bare Enter', () => {
    expect(cellKeyAction({ key: 'Enter' })).toBe('commit');
  });

  it('cancels on Escape', () => {
    expect(cellKeyAction({ key: 'Escape' })).toBe('cancel');
  });

  it('leaves Shift-Enter alone — it keeps its own meaning', () => {
    expect(cellKeyAction({ key: 'Enter', shiftKey: true })).toBe('none');
  });

  it('leaves a modified Enter alone', () => {
    expect(cellKeyAction({ key: 'Enter', ctrlKey: true })).toBe('none');
    expect(cellKeyAction({ key: 'Enter', altKey: true })).toBe('none');
    expect(cellKeyAction({ key: 'Enter', metaKey: true })).toBe('none');
  });

  it('ignores both keys while an IME is composing (G490)', () => {
    expect(cellKeyAction({ key: 'Enter', isComposing: true })).toBe('none');
    expect(cellKeyAction({ key: 'Escape', keyCode: 229 })).toBe('none');
  });

  it('ignores anything else', () => {
    expect(cellKeyAction({ key: 'a' })).toBe('none');
    expect(cellKeyAction({ key: 'Tab' })).toBe('none');
  });
});
