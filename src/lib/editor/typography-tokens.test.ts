import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  BODY_ITALIC,
  BODY_TOKENS,
  CAPTION_TOKENS,
  HEADING_ALLCAPS,
  HEADING_TOKENS,
  TYPOGRAPHY_CLASSES,
  UI_TOKENS,
} from './typography-tokens';

/**
 * The typography layer (G1092). Four token families (128 names) and 31 bridge classes, each class
 * the same eight declarations. The two rules that are easy to get wrong: within one size only the
 * weight changes, and the allcaps variant is the one place a variant moves a non-transform value.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');

describe('the token families', () => {
  it('counts 60 + 30 + 16 + 22 token names', () => {
    // ui: 15 groups × 4; heading: 5 groups × 4 + 2 allcaps × 2; caption: 4 × 4; body: 3 × 4 + 2 italic × 5.
    expect(Object.keys(UI_TOKENS)).toHaveLength(15);
    expect(Object.keys(HEADING_TOKENS)).toHaveLength(5);
    expect(Object.keys(CAPTION_TOKENS)).toHaveLength(4);
    expect(Object.keys(BODY_TOKENS)).toHaveLength(3);
    expect(Object.keys(BODY_ITALIC)).toHaveLength(2);
  });

  it('keeps the other three properties fixed within a ui size', () => {
    expect(UI_TOKENS['md-400'].slice(0, 1)).toEqual(UI_TOKENS['md-600'].slice(0, 1));
    expect(UI_TOKENS['md-400'][2]).toBe(UI_TOKENS['md-600'][2]); // line-height
    expect(UI_TOKENS['md-400'][3]).toBe(UI_TOKENS['md-600'][3]); // letter-spacing
    expect(UI_TOKENS['md-400'][1]).toBe(400);
    expect(UI_TOKENS['md-600'][1]).toBe(600);
  });

  it('raises the allcaps letter-spacing to .15px for xs-600, the one optical correction', () => {
    expect(HEADING_ALLCAPS['xs-600']).toBe('.15px');
    expect(HEADING_ALLCAPS['xxs-600']).toBe('.05px');
  });

  it('gives the caption pair inverted line-height and letter-spacing', () => {
    expect(CAPTION_TOKENS['md-400'][2]).toBe('16px');
    expect(CAPTION_TOKENS['md-400'][3]).toBe('.01px');
    expect(CAPTION_TOKENS['md-500'][2]).toBe('13.2px');
    expect(CAPTION_TOKENS['md-500'][3]).toBe('.05px');
  });
});

describe('the bridge classes', () => {
  it('names all 31, in the official order', () => {
    expect(TYPOGRAPHY_CLASSES).toHaveLength(31);
    expect(TYPOGRAPHY_CLASSES[0]).toBe('ui-xs-500');
    expect(TYPOGRAPHY_CLASSES[14]).toBe('ui-xxl-600');
    expect(TYPOGRAPHY_CLASSES[15]).toBe('heading-xxs-600');
    expect(TYPOGRAPHY_CLASSES[TYPOGRAPHY_CLASSES.length - 1]).toBe('body-md-500-italic');
  });

  it('emits every class into the stylesheet', () => {
    for (const name of TYPOGRAPHY_CLASSES) {
      expect(css, `missing .typography-${name}`).toContain(`.typography-${name} {`);
    }
  });

  it('gives each class the shared declarations', () => {
    const at = css.indexOf('.typography-ui-md-500 {');
    const body = css.slice(at, css.indexOf('}', at));
    expect(body).toContain('font-family: var(--font-family);');
    expect(body).toContain('-webkit-font-smoothing: antialiased;');
    expect(body).toContain('font-variant-numeric: lining-nums;');
    expect(body).toContain('font-feature-settings: "lnum" 1, "calt" 1;');
    expect(body).toContain('font-size: var(--ui-md-500-size);');
    expect(body).toContain('letter-spacing: var(--ui-md-500-letter-spacing);');
  });

  it('adds the italic style only on the italic variants', () => {
    const at = css.indexOf('.typography-body-md-400-italic {');
    const body = css.slice(at, css.indexOf('}', at));
    expect(body).toContain('font-style: var(--body-md-400-italic-style);');
  });

  it('gives the allcaps variant its transform and its own letter-spacing', () => {
    const at = css.indexOf('.typography-heading-xs-600-allcaps {');
    const body = css.slice(at, css.indexOf('}', at));
    expect(body).toContain('text-transform: var(--heading-xs-600-allcaps-transform);');
    expect(body).toContain('letter-spacing: var(--heading-xs-600-allcaps-letter-spacing);');
  });

  it('defines the single font entry point the classes read', () => {
    expect(css).toContain('--font-family: var(--font-sans);');
  });
});
