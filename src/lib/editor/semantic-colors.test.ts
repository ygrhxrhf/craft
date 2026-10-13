import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The semantic colour board (G1060 / G1061). Four colours only, and a different board from the
 * six accent colours — `--blue` is `0 136 255` where `--accent-blue` is `46 109 233`. Dark is a
 * per-colour re-point; `--accent-contrast` flips back to the page base rather than staying white.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
const flat = css.replace(/\s+/g, ' ');

function enclosingRule(declaration: string): string {
  const at = flat.indexOf(declaration);
  expect(at, `declaration not found: ${declaration}`).toBeGreaterThanOrEqual(0);
  const open = flat.lastIndexOf('{', at);
  const close = flat.indexOf('}', at);
  return flat.slice(open + 1, close).trim();
}

describe('the semantic colour board is four colours, re-pointed in dark', () => {
  it('declares the four light values verbatim', () => {
    const body = enclosingRule('--red: 255 56 60;');
    expect(body).toContain('--orange: 255 141 40;');
    expect(body).toContain('--green: 52 199 89;');
    expect(body).toContain('--blue: 0 136 255;');
  });

  it('re-points each colour in dark rather than inverting the block', () => {
    const body = enclosingRule('--red: 255 66 69;');
    expect(body).toContain('--orange: 251 164 65;');
    expect(body).toContain('--green: 64 221 138;');
    expect(body).toContain('--blue: 0 145 255;');
  });

  it('keeps the two boards apart: the semantic blue is not the accent blue', () => {
    expect(css).toContain('--blue: 0 136 255;');
    expect(css).toContain('--accent-blue: 46 109 233;');
  });

  it('flips the accent ink to the page base in dark', () => {
    expect(css).toContain('--accent-contrast: 255 255 255;');
    expect(flat).toContain('--accent-contrast: var(--base);');
  });

  it('declares color-scheme per theme', () => {
    expect(flat).toContain('color-scheme: light;');
    expect(flat).toContain('color-scheme: dark;');
  });
});
