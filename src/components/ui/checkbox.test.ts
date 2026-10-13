import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The official checkbox family (`_1fgll_`, `styles.md §二`): an 18px fully round box with a 1.5px
 * border, sized through three overridable variables, transitioning `transform` alongside the
 * colours. The local control had been a 16px square with a fixed 1px border.
 */
const source = readFileSync(fileURLToPath(new URL('./checkbox.tsx', import.meta.url)), 'utf8');
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');

describe('the checkbox follows the official four specs', () => {
  it('is round, not a square', () => {
    expect(source).toContain('rounded-full');
    expect(source).not.toContain('rounded-[4px]');
  });

  it('sizes itself from the override variables rather than a fixed step', () => {
    expect(source).toContain('size-[var(--cb-size)]');
    expect(source).toContain('border-[length:var(--cb-border-width)]');
    expect(source).not.toContain('size-4');
  });

  it('transitions transform alongside the colours', () => {
    expect(source).toContain('transition-[border-color,background,opacity,transform]');
  });

  it('keeps the three dimensions overridable, at the official defaults', () => {
    expect(css).toContain('--cb-wrapper-size: 1.25rem;');
    expect(css).toContain('--cb-size: 1.125rem;');
    expect(css).toContain('--cb-border-width: 1.5px;');
  });
});
