import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The accent palette (G1066 / G1089 / G1090 / G1097). Two hops: a consumer reads `--accent-100`,
 * and `[data-accent=…]` re-points that alias at `--accent-<colour>-100`. The 18 steps split into
 * an alpha segment (derived from the base, so a base change carries it) and an opaque segment
 * (literal rgb, rewritten per theme, and its direction reverses in dark).
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
/** Collapse whitespace so multi-line selectors and declarations match as one string. */
const flat = css.replace(/\s+/g, ' ');

/** The declarations of the rule that *contains* `declaration`. */
function enclosingRule(declaration: string): string {
  const at = flat.indexOf(declaration);
  expect(at, `declaration not found: ${declaration}`).toBeGreaterThanOrEqual(0);
  const open = flat.lastIndexOf('{', at);
  const close = flat.indexOf('}', at);
  return flat.slice(open + 1, close).trim();
}

describe('the accent palette is the official two-hop channel', () => {
  it('declares the six light base colours verbatim', () => {
    const body = enclosingRule('--accent-blue: 46 109 233;');
    expect(body).toContain('--accent-pink: 214 23 155;');
    expect(body).toContain('--accent-green: 0 194 166;');
    expect(body).toContain('--accent-purple: 94 2 210;');
    expect(body).toContain('--accent-yellow: 228 192 17;');
    expect(body).toContain('--accent-gray: 82 92 102;');
  });

  it('derives the alpha segment from the base with the official percentage table', () => {
    const body = enclosingRule('--accent-blue-50: rgb(var(--accent-blue) / 6%);');
    expect(body).toContain('--accent-blue-100: rgb(var(--accent-blue) / 12%);');
    expect(body).toContain('--accent-blue-250: rgb(var(--accent-blue) / 32%);');
    expect(body).toContain('--accent-blue-350: rgb(var(--accent-blue) / 55%);');
    expect(body).toContain('--accent-blue-450: rgb(var(--accent-blue) / 85%);');
    expect(body).toContain('--accent-blue-500: rgb(var(--accent-blue) / 100%);');
  });

  it('writes the opaque segment as literal rgb, dark first step lighter than the dark base', () => {
    expect(css).toContain('--accent-blue-550: rgb(44 103 217 / 100%);');
    expect(css).toContain('--accent-blue-900: rgb(34 60 111 / 100%);');
    // Dark: `-550` (124 184 255) is one step lighter than the dark base (113 178 255).
    expect(css).toContain('--accent-blue-550: rgb(124 184 255 / 100%);');
    expect(css).toContain('--accent-blue-900: rgb(195 221 251 / 100%);');
  });

  it('re-points all 18 aliases per theme block, holding no literal colour', () => {
    const body = enclosingRule('--accent-50: var(--accent-blue-50);');
    for (const step of [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900]) {
      expect(body, `missing step ${step}`).toContain(`--accent-${step}: var(--accent-blue-${step});`);
    }
    // A literal rgb in a theme block would defeat the two-hop structure.
    expect(body).not.toMatch(/rgb\(/);
  });

  it('offers all six themes', () => {
    for (const key of ['blue', 'pink', 'green', 'purple', 'yellow', 'gray']) {
      expect(css).toContain(`[data-accent='${key}'] {`);
    }
  });

  it('hangs the light tree on the scope selector so a subtree can carry it', () => {
    expect(flat).toContain(':root, .token-scope {');
  });
});
