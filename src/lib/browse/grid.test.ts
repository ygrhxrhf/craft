import { describe, expect, it } from 'vitest';

import {
  CARD_MAX_WIDTH,
  NARROW_THRESHOLD,
  cardHeightForWidth,
  cardWidthForWidth,
  columnsForWidth,
} from './grid';

/**
 * The browse grid geometry (G1096). Columns come from the container width, not from breakpoints:
 * below 452 the grid is two columns, otherwise `floor((w − 32 + 20) / 220)` clamped to 2–5.
 */
describe('the column count is computed from the container width', () => {
  it('uses the verbatim 452 threshold', () => {
    expect(NARROW_THRESHOLD).toBe(452);
  });

  it('drops to two columns below the threshold', () => {
    expect(columnsForWidth(451)).toBe(2);
    expect(columnsForWidth(300)).toBe(2);
    expect(columnsForWidth(0)).toBe(2);
  });

  it('grows a column at a time as the container widens', () => {
    // (w − 32 + 20) / 220, floored: 452→2, 672→3, 892→4, 1112→5.
    expect(columnsForWidth(452)).toBe(2);
    expect(columnsForWidth(672)).toBe(3);
    expect(columnsForWidth(892)).toBe(4);
    expect(columnsForWidth(1112)).toBe(5);
  });

  it('never exceeds five columns however wide the container is', () => {
    expect(columnsForWidth(4000)).toBe(5);
  });

  it('falls back to the narrow count for a width that is not a usable number', () => {
    expect(columnsForWidth(Number.NaN)).toBe(2);
    expect(columnsForWidth(Number.POSITIVE_INFINITY)).toBe(2);
  });
});

describe('card geometry', () => {
  it('caps the card at 268', () => {
    expect(cardWidthForWidth(4000)).toBeLessThanOrEqual(CARD_MAX_WIDTH);
  });

  it('makes the card taller than it is wide, at the official 1.25 ratio', () => {
    const width = cardWidthForWidth(892);
    expect(cardHeightForWidth(892)).toBeCloseTo(width * 1.25, 6);
  });

  it('divides the row evenly between the columns', () => {
    // At exactly the 5-column width the share fits within the cap.
    const width = cardWidthForWidth(1112);
    expect(width).toBeLessThanOrEqual(CARD_MAX_WIDTH);
    expect(width).toBeGreaterThan(0);
  });
});
