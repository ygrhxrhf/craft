import { describe, expect, it } from 'vitest';
import {
  EMPTY_CELL_SELECTION,
  cellSelectionKind,
  makeCellSelection,
  toggleInTableCellSelection,
} from './cell-selection';

describe('cellSelectionKind (G631)', () => {
  it('no cell selected is the first-class empty state, not null', () => {
    expect(cellSelectionKind(0, 6)).toBe('empty');
    expect(EMPTY_CELL_SELECTION).toEqual({ kind: 'empty', count: 0 });
  });

  it('every cell selected is the full-table state', () => {
    expect(cellSelectionKind(6, 6)).toBe('full');
  });

  it('one or a few cells is the single family', () => {
    expect(cellSelectionKind(1, 6)).toBe('single');
    // 官方按"是否满表"分三态，不是按格数 1 与 N 分 ⇒ 非满表的多格仍属 single。
    expect(cellSelectionKind(3, 6)).toBe('single');
  });

  it('a degenerate table with zero cells reads as empty', () => {
    expect(cellSelectionKind(0, 0)).toBe('empty');
  });

  it('makeCellSelection carries the count and clamps negatives', () => {
    expect(makeCellSelection(2, 6)).toEqual({ kind: 'single', count: 2 });
    expect(makeCellSelection(-1, 6)).toEqual({ kind: 'empty', count: 0 });
  });
});

describe('toggleInTableCellSelection (G631)', () => {
  it('adds a cell that is not in the selection', () => {
    expect(toggleInTableCellSelection(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes a cell that is already in the selection', () => {
    expect(toggleInTableCellSelection(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('is its own inverse', () => {
    const once = toggleInTableCellSelection([], 'x');
    expect(toggleInTableCellSelection(once, 'x')).toEqual([]);
  });
});
