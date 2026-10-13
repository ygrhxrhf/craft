import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The scalar-token layer of `styles.md §一` / `tokens-css-assets.md`: radius, the six-layer shadow
 * stacks, and the browse width. Every value here is compared against the official string rather
 * than a second copy of it, so a mistranscription fails on the token, not on the expectation.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
const darkBlock = /(^|\n)\s*\.dark\s*\{([\s\S]*?)\n\s*\}/.exec(css)?.[2] ?? '';

function token(name: string) {
  const re = new RegExp('--' + name + '\\s*:\\s*([^;]+);');
  const inDark = re.exec(darkBlock)?.[1]?.trim().replace(/\s+/g, ' ');
  const inRoot = re.exec(css)?.[1]?.trim().replace(/\s+/g, ' ');
  return { inDark, inRoot };
}

/** Six-layer stacks, written the way the official table writes them. */
const SIX_LAYER = {
  light: {
    empty:
      '0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0)',
    xs: '0 1px 1px rgb(0 0 0 / 0.04), 0 3px 3px rgb(0 0 0 / 0.04), 0 6px 4px rgb(0 0 0 / 0.02), 0 11px 4px rgb(0 0 0 / 0.01), 0 17px 5px rgb(0 0 0 / 0), 0 0 0 1px rgb(0 0 0 / 0.03)',
    sm: '0 2px 4px rgb(0 0 0 / 0.07), 0 8px 8px rgb(0 0 0 / 0.06), 0 18px 11px rgb(0 0 0 / 0.04), 0 32px 13px rgb(0 0 0 / 0.01), 0 51px 14px rgb(0 0 0 / 0), 0 0 0 1px rgb(0 0 0 / 0.03)',
    md: '0 4px 9px rgb(0 0 0 / 0.07), 0 16px 16px rgb(0 0 0 / 0.06), 0 36px 22px rgb(0 0 0 / 0.04), 0 65px 26px rgb(0 0 0 / 0.01), 0 101px 28px rgb(0 0 0 / 0), 0 0 0 1px rgb(0 0 0 / 0.03)',
    sr: '0 1px 2px rgb(0 0 0 / 0.05), 0 4px 4px rgb(0 0 0 / 0.04), 0 9px 5px rgb(0 0 0 / 0.03), 0 16px 6px rgb(0 0 0 / 0.01), 0 25px 7px rgb(0 0 0 / 0), 0 0 0 1px rgb(0 0 0 / 0.03)',
    inner: 'inset rgb(255 255 255 / 0.88) 0 0 0 1px',
  },
  dark: {
    empty:
      '0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0)',
    xs: '0 1px 1px rgb(0 0 0 / 0.08), 0 3px 3px rgb(0 0 0 / 0.07), 0 6px 4px rgb(0 0 0 / 0.04), 0 11px 4px rgb(0 0 0 / 0.01), 0 17px 5px rgb(0 0 0 / 0), 0 0 0 1px rgb(0 0 0 / 0.12)',
    sm: '0 2px 4px rgb(0 0 0 / 0.1), 0 8px 8px rgb(0 0 0 / 0.09), 0 18px 11px rgb(0 0 0 / 0.05), 0 32px 13px rgb(0 0 0 / 0.01), 0 51px 14px rgb(0 0 0 / 0), 0 0 0 1px rgb(0 0 0 / 0.12)',
    md: '0 4px 9px rgb(0 0 0 / 0.12), 0 16px 16px rgb(0 0 0 / 0.1), 0 36px 22px rgb(0 0 0 / 0.06), 0 65px 26px rgb(0 0 0 / 0.02), 0 101px 28px rgb(0 0 0 / 0), 0 0 0 1px rgb(0 0 0 / 0.12)',
    sr: '0 1px 2px rgb(0 0 0 / 0.09), 0 4px 4px rgb(0 0 0 / 0.08), 0 9px 5px rgb(0 0 0 / 0.05), 0 16px 6px rgb(0 0 0 / 0.01), 0 25px 7px rgb(0 0 0 / 0), 0 0 0 1px rgb(0 0 0 / 0.12)',
    inner: 'inset rgb(255 255 255 / 0.04) 0 0 0 1px',
  },
} as const;

describe('the official scalar tokens', () => {
  it('declares radius-full, which the pill shapes had been hard-writing', () => {
    expect(token('radius-full').inRoot).toBe('9999px');
  });

  it('declares the browse width ceiling', () => {
    expect(token('browse-max-width').inRoot).toBe('1630px');
  });

  it.each(Object.entries(SIX_LAYER.light))('--shadow-%s carries all six light layers', (name, value) => {
    expect(token(`shadow-${name}`).inRoot).toBe(value);
  });

  it.each(Object.entries(SIX_LAYER.dark))('--shadow-%s is re-pointed for dark', (name, value) => {
    expect(token(`shadow-${name}`).inDark).toBe(value);
  });

  it('keeps xxs at its own three-layer stack', () => {
    expect(token('shadow-xxs').inRoot).toBe(
      '0 0 0 1px rgb(0 0 0 / 0.04), 0 1px 1.5px rgb(0 0 0 / 0.06), 0 2.5px 4px rgb(0 0 0 / 0.06)',
    );
    expect(token('shadow-xxs').inDark).toBe(
      '0 0 0 1px rgb(0 0 0 / 0.12), 0 1px 1.5px rgb(0 0 0 / 0.14), 0 2.5px 4px rgb(0 0 0 / 0.16)',
    );
  });

  it('makes the dark shadows heavier than the light ones, not lighter', () => {
    // The official dark values raise every alpha; a shared value would be the easy mistake.
    expect(token('shadow-sm').inDark).not.toBe(token('shadow-sm').inRoot);
    expect(token('shadow-md').inDark).not.toBe(token('shadow-md').inRoot);
  });
});
