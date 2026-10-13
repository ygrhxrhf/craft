import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WASHI_COLOR,
  WASHI_PATTERNS,
  WASHI_SEPARATOR,
  isWashiPattern,
  washiPattern,
} from './washi-patterns';

/**
 * The washi patterns (G1247). Six built-in patterns with their official descriptions, and the
 * three write-side flags.
 */
describe('the six patterns', () => {
  it('has all six, in the collected order', () => {
    expect(WASHI_PATTERNS.map((p) => p.name)).toEqual(['hex', 'dot', 'stripe', 'diagonal', 'grid', 'wave']);
  });

  it('carries each description verbatim', () => {
    expect(washiPattern('hex')?.description).toBe('Hexagon geometric pattern');
    expect(washiPattern('dot')?.description).toBe('Dot pattern');
    expect(washiPattern('stripe')?.description).toBe('Horizontal stripe pattern');
    expect(washiPattern('diagonal')?.description).toBe('Diagonal stripe pattern');
    expect(washiPattern('grid')?.description).toBe('Grid pattern');
    expect(washiPattern('wave')?.description).toBe('Wave pattern');
  });

  it('marks every pattern built-in, since no other type has been observed', () => {
    for (const pattern of WASHI_PATTERNS) {
      expect(pattern.type, pattern.name).toBe('built-in');
    }
  });
});

describe('the write-side flags', () => {
  it('names the separator value and the default colour verbatim', () => {
    expect(WASHI_SEPARATOR).toBe('washi');
    expect(DEFAULT_WASHI_COLOR).toBe('#3B82F6');
  });

  it('guards pattern names', () => {
    expect(isWashiPattern('wave')).toBe(true);
    expect(isWashiPattern('zigzag')).toBe(false);
    expect(isWashiPattern(null)).toBe(false);
  });

  it('returns null for a name outside the six rather than inventing one', () => {
    expect(washiPattern('zigzag')).toBeNull();
    expect(washiPattern(7)).toBeNull();
  });
});
