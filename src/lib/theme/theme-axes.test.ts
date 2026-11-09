import { describe, expect, it } from 'vitest';

import { pointerAxisOf, scrollbarAxisOf, themeAxes } from './theme-axes';

// G1384: the two input-media axes written onto <html> next to the scheme.
describe('the theme axes', () => {
  it('maps the pointer media queries through the official three-way read (G1206 Rtt)', () => {
    expect(pointerAxisOf(true, false)).toBe('fine');
    expect(pointerAxisOf(false, true)).toBe('coarse');
    // Neither query matching is a real state (no pointing device), not an alias for fine.
    expect(pointerAxisOf(false, false)).toBe('none');
  });

  it('writes the scrollbar axis only when persistent', () => {
    expect(scrollbarAxisOf(true)).toBe('persistent');
    expect(scrollbarAxisOf(false)).toBeNull();
  });

  it('derives both from the environment', () => {
    expect(themeAxes({ finePointer: false, coarsePointer: true, persistentScrollbar: false })).toEqual({
      pointer: 'coarse',
      scrollbar: null,
    });
    expect(themeAxes({ finePointer: true, coarsePointer: false, persistentScrollbar: true })).toEqual({
      pointer: 'fine',
      scrollbar: 'persistent',
    });
    expect(themeAxes({ finePointer: false, coarsePointer: false, persistentScrollbar: false })).toEqual({
      pointer: 'none',
      scrollbar: null,
    });
  });
});
