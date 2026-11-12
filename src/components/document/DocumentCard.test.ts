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

describe('the hover swap is a two-layer exchange, not an overlay', () => {
  it('fades the resting layer out on hover and focus', () => {
    expect(source).toContain('group-hover:opacity-0');
    expect(source).toContain('group-focus-visible:opacity-0');
  });

  it('fades the action layer in with the same triggers', () => {
    expect(source).toContain('group-hover:opacity-100');
    expect(source).toContain('group-focus-visible:opacity-100');
  });

  it('positions the action layer over the card so the height never moves', () => {
    expect(source).toContain('absolute inset-0');
    expect(source).toContain('pointer-events-none');
  });
});

/**
 * G19/G20: the card head is one subtitle line (`breadcrumb • 已更新 N`), and the trash grid reuses
 * the same card — a static tile with no route, whose preview is the stored text snapshot and whose
 * hover action is 恢复.
 */
describe('the subtitle line and the trash variant', () => {
  it('renders the joined subtitle, not the old stacked lines', () => {
    expect(source).toContain('{head.subtitle}');
    expect(source).not.toContain('{head.updated}');
  });

  it('carries the folder glyph only when a location exists', () => {
    expect(source).toContain('head.breadcrumb && <Folder');
  });

  it('offers the static-tile form for non-openable rows', () => {
    expect(source).toContain('href === undefined ? `/documents/${doc.id}` : href');
    expect(source).toContain('{target ? (');
  });

  it('previews the trash row from its stored text and offers 恢复', () => {
    expect(source).toContain('doc.previewText');
    expect(source).toContain('onRestore(doc.id)');
  });
});
