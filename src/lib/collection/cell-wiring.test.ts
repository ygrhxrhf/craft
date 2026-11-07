import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Source wiring for the collection cell surface: the pure rules live in
 * `inline-input.ts` / `limits.ts`, and these assertions keep the component reading them
 * instead of drifting back to per-case literals.
 */
const cell = readFileSync(
  join(process.cwd(), 'src/components/collection/PropertyCell.tsx'),
  'utf8',
);
const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('the inline text cells (G457/G1532)', () => {
  it('derives inputMode from propertyType, with an external override', () => {
    expect(cell).toContain('inlineInputMode(propertyType, inputMode)');
    expect(cell).toContain('propertyType="phone"');
    expect(cell).toContain("inlinePlaceholder('url')");
  });

  it('applies the 10000-character cap to the url and email siblings too', () => {
    const url = cell.slice(cell.indexOf('function URLCell'), cell.indexOf('function EmailCell'));
    const email = cell.slice(cell.indexOf('function EmailCell'), cell.indexOf('function FormulaCell'));
    expect(url).toContain('exceedsCharacterLimit(next)');
    expect(email).toContain('exceedsCharacterLimit(next)');
  });
});

describe('the collection row geometry (G483)', () => {
  it('reads the official 35px row height and 10px horizontal padding from the token pair', () => {
    expect(css).toContain('--st-row-height: 35px;');
    expect(css).toContain('--st-cell-padding-x: 10px;');
    expect(cell).toContain('min-h-[var(--st-row-height)]');
    expect(cell).toContain('px-[var(--st-cell-padding-x)]');
    expect(cell).not.toContain('min-h-8');
  });
});

describe('the collection boolean cell (G455)', () => {
  it('is the official 39×24 rounded switch, not a 16px check box', () => {
    expect(cell).toContain('h-6 w-[39px] rounded-[12px]');
    expect(cell).toContain('bg-[var(--accent-500)]');
    expect(cell).toContain('duration-300');
    expect(cell).toContain("value ? 'left-[18px]' : 'left-[3px]'");
  });
});