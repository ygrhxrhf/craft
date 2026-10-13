import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { EMPTY_PLACEHOLDER_HEIGHT, EMPTY_PLACEHOLDER_WIDTH } from '@/lib/browse/grid';

/**
 * The empty-state placeholder card (G1096). The official box is 240 wide and 300 tall (240 × 1.25),
 * with an 8px radius, and can be hidden as a spacer that keeps the grid height without painting.
 */
const source = readFileSync(
  fileURLToPath(new URL('./PlaceholderCard.tsx', import.meta.url)),
  'utf8',
);

describe('the placeholder card', () => {
  it('uses the official 240 × 300 box', () => {
    expect(EMPTY_PLACEHOLDER_WIDTH).toBe(240);
    expect(EMPTY_PLACEHOLDER_HEIGHT).toBe(300);
    expect(source).toContain('width: EMPTY_PLACEHOLDER_WIDTH');
    expect(source).toContain('height: EMPTY_PLACEHOLDER_HEIGHT');
  });

  it('keeps the 300 = 240 × 1.25 relationship', () => {
    expect(EMPTY_PLACEHOLDER_HEIGHT).toBeCloseTo(EMPTY_PLACEHOLDER_WIDTH * 1.25, 6);
  });

  it('can be hidden as a spacer rather than removed from the grid', () => {
    expect(source).toContain("'invisible'");
    expect(source).toContain('hidden = false');
  });

  it('stays out of the accessibility tree', () => {
    expect(source).toContain('aria-hidden');
  });
});
