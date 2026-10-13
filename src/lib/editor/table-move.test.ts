import { describe, expect, it } from 'vitest';

import { gridIsUniform, movedOrder } from './table-move';

const cell = { colspan: 1, rowspan: 1 };

describe('whether a table can be moved', () => {
  it('allows a rectangular table of plain cells', () => {
    expect(gridIsUniform([[cell, cell], [cell, cell]])).toBe(true);
  });

  it('refuses a merged cell or rows of different lengths', () => {
    expect(gridIsUniform([[{ colspan: 2, rowspan: 1 }, cell], [cell, cell]])).toBe(false);
    expect(gridIsUniform([[cell, cell], [cell]])).toBe(false);
    expect(gridIsUniform([])).toBe(false);
  });
});

describe('the move', () => {
  it('swaps the row with its neighbour', () => {
    expect(movedOrder(4, 1, -1)).toEqual([1, 0, 2, 3]);
    expect(movedOrder(4, 1, 1)).toEqual([0, 2, 1, 3]);
  });

  it('does nothing at the edge', () => {
    expect(movedOrder(4, 0, -1)).toBeNull();
    expect(movedOrder(4, 3, 1)).toBeNull();
  });

  it('ignores an index outside the table', () => {
    expect(movedOrder(3, 5, 1)).toBeNull();
  });
});
