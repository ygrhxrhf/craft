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
const layout = readFileSync(fileURLToPath(new URL('../../app/layout.tsx', import.meta.url)), 'utf8');

describe('the code block asks for the official font', () => {
  it('leads the mono stack with the self-hosted Roboto Mono variable', () => {
    expect(css).toContain("--font-mono: var(--font-roboto-mono), 'Roboto Mono', ui-monospace");
  });

  it('actually loads the face, so the name in the stack resolves', () => {
    // A bare `Roboto Mono` in the stack only helps machines that happen to have it installed.
    expect(layout).toContain('Roboto_Mono');
    expect(layout).toContain("variable: '--font-roboto-mono'");
    expect(layout).toContain('${robotoMono.variable}');
  });

  it('keeps a system fallback behind it, so a machine without the face still renders', () => {
    expect(css).toMatch(/--font-mono: [^;]*monospace;/);
  });

  it('puts the font on the block itself rather than inheriting whatever is around', () => {
    // The gutter and the code each carry the mono face, so the line numbers match the code.
    expect(view).toContain('text-right font-mono');
    expect(view).toContain('pr-3 font-mono');
  });
});
