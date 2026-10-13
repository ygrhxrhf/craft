import { describe, expect, it } from 'vitest';

import { DEFAULT_FLAVOUR } from './flavour';
import {
  TOKEN_DOUBLE_LINE,
  TOKEN_INDENT,
  TOKEN_SOFT_LINE,
  decodeTemplate,
  stripTemplateLayout,
} from './template-decode';

/**
 * The block-template decoder (G1172). Three tokens in a fixed order, and a soft-line break that
 * depends on whether the output is inline.
 */
describe('stripping the template layout', () => {
  it('joins the lines with no separator, keeping each line’s own indentation', () => {
    // The verbatim code is `split("\n").filter(non-blank).join("")` — the newlines go, the
    // leading whitespace inside a non-blank line stays.
    expect(stripTemplateLayout('a\n   b\nc')).toBe('a   bc');
  });

  it('drops blank lines entirely', () => {
    expect(stripTemplateLayout('a\n\n  \nb')).toBe('ab');
  });
});

describe('expanding the tokens', () => {
  it('turns \\dl into a blank line', () => {
    expect(decodeTemplate(`a${TOKEN_DOUBLE_LINE}b`, false)).toBe('a\n\nb');
  });

  it('turns \\sl into a space inline, and a br in block context', () => {
    expect(decodeTemplate(`a${TOKEN_SOFT_LINE}b`, true)).toBe('a b');
    expect(decodeTemplate(`a${TOKEN_SOFT_LINE}b`, false)).toBe('a<br>b');
  });

  it('turns \\i__craft into one level of the flavour indent', () => {
    expect(decodeTemplate(`a${TOKEN_INDENT}b`, false)).toBe(`a${DEFAULT_FLAVOUR.indentationCharacters}b`);
    expect(DEFAULT_FLAVOUR.indentationCharacters).toBe('   ');
  });

  it('applies the three tokens in the official order', () => {
    // A template using all three: the layout strip runs first, then dl, sl, indent.
    const template = `x ${TOKEN_INDENT}y${TOKEN_SOFT_LINE}z${TOKEN_DOUBLE_LINE}w`;
    expect(decodeTemplate(template, false)).toBe('x    y<br>z\n\nw');
  });
});
