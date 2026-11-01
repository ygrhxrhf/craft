import { describe, expect, it } from 'vitest';

import { pointerAxisOf, scrollbarAxisOf, themeAxes } from './theme-axes';

// G1384: the two input-media axes written onto <html> next to the scheme.
describe('the theme axes', () => {
  it('maps the pointer media query', () => {
    expect(pointerAxisOf(true)).toBe('coarse');
    expect(pointerAxisOf(false)).toBe('fine');
  });

  it('writes the scrollbar axis only when persistent', () => {
    expect(scrollbarAxisOf(true)).toBe('persistent');
    expect(scrollbarAxisOf(false)).toBeNull();
  });

  it('derives both from the environment', () => {
    expect(themeAxes({ coarsePointer: true, persistentScrollbar: false })).toEqual({
      pointer: 'coarse',
      scrollbar: null,
    });
    expect(themeAxes({ coarsePointer: false, persistentScrollbar: true })).toEqual({
      pointer: 'fine',
      scrollbar: 'persistent',
    });
  });
});
