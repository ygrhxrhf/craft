import { describe, expect, it } from 'vitest';

import { escapeRung } from './escape-rungs';

/** G633：`Esc` 的降级阶梯＝块选中 → 单元格 → 范围 → 整块（第 ④ 档来自 G1583）。 */
describe('the Escape ladder', () => {
  it('leaves the editor from a block selection', () => {
    expect(
      escapeRung({ blockSelected: true, inTableCell: true, singleCellSelected: false, hasRange: true }),
    ).toBe('leave');
  });

  it('selects the cell when the caret or a multi-cell selection sits in a table', () => {
    expect(
      escapeRung({ blockSelected: false, inTableCell: true, singleCellSelected: false, hasRange: false }),
    ).toBe('table-cell');
    expect(
      escapeRung({ blockSelected: false, inTableCell: true, singleCellSelected: false, hasRange: true }),
    ).toBe('table-cell');
  });

  it('collapses a one-cell selection or a text range to a caret', () => {
    expect(
      escapeRung({ blockSelected: false, inTableCell: true, singleCellSelected: true, hasRange: true }),
    ).toBe('collapse');
    expect(
      escapeRung({ blockSelected: false, inTableCell: false, singleCellSelected: false, hasRange: true }),
    ).toBe('collapse');
  });

  it('turns a bare caret into a block selection', () => {
    expect(
      escapeRung({ blockSelected: false, inTableCell: false, singleCellSelected: false, hasRange: false }),
    ).toBe('block');
  });

  it('never repeats a rung inside a table', () => {
    // 光标（格内）→ 单格 → 光标 → 整块 → 离开，五下退完，没有一步原地打转。
    const rungs = [
      escapeRung({ blockSelected: false, inTableCell: true, singleCellSelected: false, hasRange: false }),
      escapeRung({ blockSelected: false, inTableCell: true, singleCellSelected: true, hasRange: true }),
      escapeRung({ blockSelected: false, inTableCell: true, singleCellSelected: false, hasRange: false }),
      escapeRung({ blockSelected: false, inTableCell: false, singleCellSelected: false, hasRange: false }),
      escapeRung({ blockSelected: true, inTableCell: false, singleCellSelected: false, hasRange: false }),
    ];
    expect(rungs).toEqual(['table-cell', 'collapse', 'table-cell', 'block', 'leave']);
  });
});