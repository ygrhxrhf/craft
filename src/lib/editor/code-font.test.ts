import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The code-block font (G1095). Official Craft sets `Roboto Mono, monospace` on both code themes;
 * locally the block had no font of its own, so it fell through to the system mono stack.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
const view = readFileSync(
  fileURLToPath(new URL('../../components/editor/extensions/code-block-view.tsx', import.meta.url)),
  'utf8',
);

describe('the code block asks for the official font', () => {
  it('leads the mono stack with Roboto Mono', () => {
    expect(css).toContain("--font-mono: 'Roboto Mono', ui-monospace");
  });

  it('keeps a system fallback behind it, so a machine without the face still renders', () => {
    expect(css).toMatch(/--font-mono: 'Roboto Mono'[^;]*monospace;/);
  });

  it('puts the font on the block itself rather than inheriting whatever is around', () => {
    // The gutter and the code each carry the mono face, so the line numbers match the code.
    expect(view).toContain('text-right font-mono');
    expect(view).toContain('pr-3 font-mono');
  });
});
