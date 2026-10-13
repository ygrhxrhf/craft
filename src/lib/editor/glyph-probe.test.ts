import { describe, expect, it } from 'vitest';

import {
  PROBE_FONT_STACK,
  createMeasurer,
  isGlyphMissing,
  needsFallbackGlyph,
  partitionByGlyph,
} from './glyph-probe';

/**
 * Glyph-missing detection (G1084). A width of zero against a stack ending in the invisible face
 * is the whole judgement — the face is a test fixture, not a rendering fallback.
 */
describe('the missing-glyph judgement', () => {
  it('reads a zero width as missing and anything else as drawable', () => {
    expect(isGlyphMissing(0)).toBe(true);
    expect(isGlyphMissing(0.5)).toBe(false);
    expect(isGlyphMissing(12)).toBe(false);
  });

  it('ends the probe stack in the invisible face', () => {
    expect(PROBE_FONT_STACK).toContain('AdobeBlank');
    expect(PROBE_FONT_STACK.endsWith('AdobeBlank')).toBe(true);
  });
});

describe('partitioning characters', () => {
  const measure = (character: string) => (character === '☃' ? 0 : 8);

  it('splits drawable from missing, keeping order', () => {
    const { drawable, missing } = partitionByGlyph(['a', '☃', 'b'], measure);
    expect(drawable).toEqual(['a', 'b']);
    expect(missing).toEqual(['☃']);
  });

  it('reports whether any character needs a fallback glyph', () => {
    expect(needsFallbackGlyph(['a', 'b'], measure)).toBe(false);
    expect(needsFallbackGlyph(['a', '☃'], measure)).toBe(true);
  });

  it('iterates code points, so a surrogate pair is one unit', () => {
    const seen: string[] = [];
    partitionByGlyph('a😀b', (character) => {
      seen.push(character);
      return 8;
    });
    // Three units, not four: the emoji is one code point.
    expect(seen).toEqual(['a', '😀', 'b']);
  });
});

describe('building a measurer', () => {
  it('returns null when there is no document to measure against', () => {
    // The vitest environment has no DOM here, which is exactly the guard's purpose.
    expect(createMeasurer()).toBeNull();
  });
});
