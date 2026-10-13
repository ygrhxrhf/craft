/**
 * Glyph-missing detection (G1084). Official Craft loads a deliberately invisible face
 * (`AdobeBlank`) and measures each character against a stack that ends in it: a width of zero
 * means the character has no glyph anywhere in the stack, which is how the app decides a
 * character has to fall back to an emoji or image glyph.
 *
 * The probe is not a rendering fallback — it is a *test*, and the invisible face exists only so
 * that "no glyph anywhere" reads as zero rather than as a system last-resort box.
 *
 * The measuring is injectable so the decision can be tested without a canvas.
 */

/** The stack the official probe measures against, ending in the invisible face. */
export const PROBE_FONT_STACK =
  '"Apple Color Emoji", "Android Emoji", "Segoe UI Emoji", AdobeBlank';

/** A width of zero is the whole judgement: nothing in the stack drew the character. */
export function isGlyphMissing(width: number): boolean {
  return width === 0;
}

/** A measure function, as `CanvasRenderingContext2D.measureText` provides it. */
export type Measure = (character: string) => number;

/**
 * Split characters into those the stack can draw and those it cannot. Order is preserved, and a
 * surrogate pair is measured as one unit because `for...of` iterates code points.
 */
export function partitionByGlyph(chars: Iterable<string>, measure: Measure): {
  drawable: string[];
  missing: string[];
} {
  const drawable: string[] = [];
  const missing: string[] = [];
  for (const character of chars) {
    if (isGlyphMissing(measure(character))) missing.push(character);
    else drawable.push(character);
  }
  return { drawable, missing };
}

/**
 * Build a measure function from a canvas context and a font string, or `null` when the document
 * has no canvas support. The context is created once and reused for every character.
 */
export function createMeasurer(font = `1em ${PROBE_FONT_STACK}`): Measure | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.font = font;
  return (character: string) => context.measureText(character).width;
}

/** Whether any of the characters would need a fallback glyph. */
export function needsFallbackGlyph(chars: Iterable<string>, measure: Measure): boolean {
  return partitionByGlyph(chars, measure).missing.length > 0;
}
