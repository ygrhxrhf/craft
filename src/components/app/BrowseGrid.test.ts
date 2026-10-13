import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CARD_MAX_WIDTH } from '@/lib/browse/grid';

/**
 * The browse grid's card ceiling (G1096). Columns come from the container width, but the card
 * itself stops growing at 268 — a very wide container widens the gap, not the card.
 */
const source = readFileSync(fileURLToPath(new URL('./BrowseGrid.tsx', import.meta.url)), 'utf8');

describe('the grid enforces the official card ceiling', () => {
  it('caps each column at the 268 constant', () => {
    expect(CARD_MAX_WIDTH).toBe(268);
    expect(source).toContain('minmax(0, ${CARD_MAX_WIDTH}px)');
  });

  it('leaves the leftover space to the gap rather than stretching the card', () => {
    expect(source).toContain("justifyContent: 'start'");
  });

  it('still derives the column count from the container width', () => {
    expect(source).toContain('columnsForWidth(width)');
    expect(source).toContain('ResizeObserver');
  });
});
