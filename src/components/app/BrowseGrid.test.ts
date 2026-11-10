import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CARD_MAX_WIDTH, cardMaxWidthForColumns } from '@/lib/browse/grid';

/**
 * The browse grid's card ceiling (G1096 / G1126). Columns come from the container width, but the
 * card itself stops growing at a tier ceiling: 268 for three or more columns, 308.5 for the wider
 * two-column layout — a very wide container widens the gap, not the card.
 */
const source = readFileSync(fileURLToPath(new URL('./BrowseGrid.tsx', import.meta.url)), 'utf8');

describe('the grid enforces the official card ceiling', () => {
  it('caps the dense tiers at the 268 constant', () => {
    expect(CARD_MAX_WIDTH).toBe(268);
  });

  it('picks the ceiling from the column count, not a single constant', () => {
    expect(cardMaxWidthForColumns(2)).toBe(308.5);
    expect(cardMaxWidthForColumns(3)).toBe(CARD_MAX_WIDTH);
    expect(source).toContain('cardMaxWidthForColumns(columns)');
    expect(source).toContain('minmax(0, ${maxWidth}px)');
  });

  it('leaves the leftover space to the gap rather than stretching the card', () => {
    expect(source).toContain("justifyContent: 'start'");
  });

  it('still derives the column count from the container width', () => {
    expect(source).toContain('columnsForWidth(width)');
    expect(source).toContain('ResizeObserver');
  });
});
