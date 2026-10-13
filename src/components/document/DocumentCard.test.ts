import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The card focus ring (G1127). Unlike the DS button's `outline`, the card draws its ring as a real
 * child element so it can carry its own z-index, sits 1px outside the card, and is hidden until
 * the card is focused. The measured 2.4px is the DPR-quantised reading of a 3px declaration.
 */
const source = readFileSync(
  fileURLToPath(new URL('./DocumentCard.tsx', import.meta.url)),
  'utf8',
);

describe('the card focus ring is its own element', () => {
  it('sits 1px outside the card', () => {
    expect(source).toContain('inset-[-1px]');
  });

  it('declares the 3px border, not the DPR-quantised 2.4px', () => {
    expect(source).toContain('border-[3px]');
    expect(source).not.toContain('2.4px');
  });

  it('carries its own stacking layer above the card content', () => {
    expect(source).toContain('z-[1]');
  });

  it('is hidden until the card is focused, and never eats the click', () => {
    expect(source).toContain('hidden');
    expect(source).toContain('group-focus-visible:block');
    expect(source).toContain('pointer-events-none');
  });

  it('rings in the accent channel rather than a hard-coded colour', () => {
    expect(source).toContain('border-(--craft-accent)');
  });
});
