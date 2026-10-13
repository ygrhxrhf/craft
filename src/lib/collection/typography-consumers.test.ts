import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { describe, expect, it } from 'vitest';

/**
 * Typography consumption points (G1092 / G1117). The official table header carries the bridge
 * class `typography-caption-md-500` alongside its component class, so the type size is a
 * component-level declaration rather than something inherited from an ancestor.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
const table = readFileSync(
  fileURLToPath(new URL('../../app/(app)/collections/[id]/TableView.tsx', import.meta.url)),
  'utf8',
);

describe('the table header consumes the typography layer', () => {
  it('puts the bridge class on the header cells', () => {
    expect(table).toContain('typography-caption-md-500');
  });

  it('keeps the class alongside the component classes, not instead of them', () => {
    // The official shape is "component class + typography class" on one element.
    expect(table).toContain('text-left typography-caption-md-500');
  });

  it('has a matching rule for the class the header names', () => {
    expect(css).toContain('.typography-caption-md-500 {');
  });

  it('compiles, so the class is a real utility in the pipeline', async () => {
    const out = await postcss([tailwind()]).process(css, { from: 'src/app/globals.css' });
    expect(out.css).toContain('typography-caption-md-500');
  });
});
