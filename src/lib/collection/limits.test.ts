import { describe, expect, it } from 'vitest';

import {
  COLLECTION_COLUMN_LIMIT_MESSAGE,
  MAX_COLLECTION_COLUMNS,
  MAX_TABLE_CELLS,
  MAX_TABLE_COLS,
  MAX_TABLE_ROWS,
  TABLE_SIZE_LIMIT_DURATION,
  TABLE_SIZE_LIMIT_SUBTITLE,
  canAddColumn,
  exceedsVirtualTableThreshold,
  tableSizeAllowed,
  tableSizeLimitMessage,
} from './limits';

// G690: twenty regular columns; the title column is not counted.
describe('collection column limit', () => {
  it('allows the twentieth column and rejects the twenty-first', () => {
    expect(canAddColumn(19)).toBe(true);
    expect(canAddColumn(20)).toBe(false);
    expect(canAddColumn(21)).toBe(false);
    expect(MAX_COLLECTION_COLUMNS).toBe(20);
  });

  it('carries the structured validation message verbatim', () => {
    expect(COLLECTION_COLUMN_LIMIT_MESSAGE).toBe(
      'Validation failed: properties: Collection cannot have more than 20 columns (properties)'
    );
  });
});

// G659: 50 rows / 15 columns / 750 cells, all three at once.
describe('editor table limits', () => {
  it('accepts a 50×15 table exactly', () => {
    expect(tableSizeAllowed(50, 15)).toBe(true);
    expect(tableSizeAllowed(50, 14)).toBe(true);
  });

  it('rejects any axis over its own ceiling', () => {
    expect(tableSizeAllowed(51, 10)).toBe(false);
    expect(tableSizeAllowed(10, 16)).toBe(false);
  });

  it('is bounded by the cell budget as well as the two axes', () => {
    // 15 × 50 = 750: the three constants agree, so the cell check never binds on its own —
    // it is still checked because a future limit change must not silently allow more cells.
    expect(MAX_TABLE_ROWS * MAX_TABLE_COLS).toBe(MAX_TABLE_CELLS);
    expect(tableSizeAllowed(50, 15)).toBe(true);
  });

  it('rejects malformed sizes', () => {
    expect(tableSizeAllowed(2.5, 3)).toBe(false);
    expect(tableSizeAllowed(-1, 3)).toBe(false);
  });

  it('prints the official toast pair', () => {
    expect(tableSizeLimitMessage(51, 15)).toBe('已达到表格大小限制（15 列，50 行）');
    expect(tableSizeLimitMessage(3, 3)).toBeNull();
    expect(TABLE_SIZE_LIMIT_SUBTITLE).toBe('尝试多个较小的表格吗？');
    expect(TABLE_SIZE_LIMIT_DURATION).toBe(4000);
  });
});

// G484: the 600-cell rendering threshold counts visible columns only.
describe('virtual table threshold', () => {
  it('switches when rows × visible columns exceeds 600', () => {
    expect(exceedsVirtualTableThreshold(100, 6)).toBe(false);
    expect(exceedsVirtualTableThreshold(101, 6)).toBe(true);
    expect(exceedsVirtualTableThreshold(700, 0)).toBe(false);
  });
});
