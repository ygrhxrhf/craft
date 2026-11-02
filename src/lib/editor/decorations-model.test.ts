import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** G630: the decoration model is three block-level slots and the downgrade clears all three. */
describe('block decorations (G630)', () => {
  const style = readFileSync(
    join(process.cwd(), 'src', 'components', 'editor', 'extensions', 'focus-style.tsx'),
    'utf8',
  );
  const keymap = readFileSync(
    join(process.cwd(), 'src', 'components', 'editor', 'extensions', 'craft-keymap.ts'),
    'utf8',
  );

  it('carries focus, block background and text colour on the block', () => {
    expect(style).toContain('focusColor');
    expect(style).toContain('backgroundColor');
    expect(style).toContain('textColor');
    expect(style).toContain('background-color');
    expect(style).toMatch(/textColor[\s\S]{0,200}color: \$\{attributes\.textColor\}/);
  });

  it('clears all three in one downgrade step', () => {
    expect(keymap).toContain('{ focusColor: null, backgroundColor: null, textColor: null }');
  });
});
