import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { MOBILE_QUERY } from './use-is-mobile';

/**
 * The narrow breakpoint is the official 748 (G1476): a window counts as narrow below 748, which a
 * `max-width: 747px` query expresses. The stylesheet has to use the same number or the shell and
 * the CSS would switch at different widths.
 */
const css = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');

describe('the narrow breakpoint', () => {
  it('is 747px, one below the official 748', () => {
    expect(MOBILE_QUERY).toBe('(max-width: 747px)');
  });

  it('is the only phone breakpoint the stylesheet uses', () => {
    expect(css).toContain('@media (max-width: 747px)');
    expect(css).not.toContain('767px');
  });
});
