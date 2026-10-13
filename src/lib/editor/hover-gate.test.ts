import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { describe, expect, it } from 'vitest';

/**
 * The hover gate (G972 / G1081). Official Craft compiles `:hover` into
 * `[data-whatintent]:not([data-whatintent=touch]) … :hover`, so a touch device never latches a
 * hover state while mouse and keyboard keep theirs. Locally the same move is a redefined Tailwind
 * `hover` variant, which is what re-aims every `hover:` and `group-hover:` utility at once.
 */
const cssPath = fileURLToPath(new URL('../../app/globals.css', import.meta.url));
const css = readFileSync(cssPath, 'utf8');

describe('the hover variant is gated on the intent attribute', () => {
  it('redefines the variant with the official ancestor gate', () => {
    expect(css).toContain(
      "@custom-variant hover ([data-whatintent]:not([data-whatintent='touch']) &:hover);",
    );
  });

  it('keeps the dark variant untouched', () => {
    expect(css).toContain('@custom-variant dark (&:is(.dark *));');
  });

  it('compiles to the gated selector rather than a bare :hover', async () => {
    // Compiling a tiny sheet that uses the variant is what proves the definition is well-formed;
    // reading the source alone would not catch a syntax error the plugin rejects.
    const probe = `
      @import "tailwindcss";
      @custom-variant hover ([data-whatintent]:not([data-whatintent='touch']) &:hover);
      @source inline("hover:bg-muted group-hover:opacity-100");
    `;
    const out = await postcss([tailwind()]).process(probe, { from: 'probe.css' });
    const compiled = out.css.replace(/\s+/g, ' ');
    expect(compiled).toContain("[data-whatintent]:not([data-whatintent='touch'])");
    // The gate must sit on the ancestor, before the element's own :hover.
    expect(compiled).toMatch(
      /\[data-whatintent\]:not\(\[data-whatintent='touch'\]\)[^,{]*:hover/,
    );
  });
});
