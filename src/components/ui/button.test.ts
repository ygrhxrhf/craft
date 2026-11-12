import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * G972: the official DS action component has six variants, one of which is the rail-selected
 * `Active`. Local's `active` variant is that first-class state: resting `--foreground-100` (4%),
 * 6% on hover / popup-open / pressed-as-toggle, 8% on `:active` (the fine-pointer rule lives in
 * globals.css). G1014: `isStatic` is a second gate distinct from `data-disabled` — a control
 * rendered as static text gets no hover, focus or press styling at all.
 */
const source = readFileSync(fileURLToPath(new URL('./button.tsx', import.meta.url)), 'utf8');

describe('the active variant is a first-class rail-selected state', () => {
  it('rests at 4% and climbs to 6% on the hover/open/pressed group', () => {
    expect(source).toContain(
      'bg-[var(--foreground-100)] text-[var(--foreground-900)] hover:bg-[var(--foreground-150)]',
    );
    for (const probe of ['aria-expanded', 'aria-pressed', 'data-popup-open']) {
      expect(source).toContain(`${probe}:bg-[var(--foreground-150)]`);
    }
  });
});

describe('the foreground-surface variants tint their icon slots to 85%', () => {
  it('gives outline and ghost the official --foreground-800 left/right content colour', () => {
    expect(source.match(/\[\&_svg\]:text-\[var\(--foreground-800\)\]/g)).toHaveLength(2);
  });
});

describe('isStatic is a second gate, not a synonym for disabled', () => {
  it('writes data-static and the base class carries no per-component disabled opacity', () => {
    expect(source).toContain('data-static={isStatic ? "" : undefined}');
    expect(source).not.toContain('disabled:opacity-');
  });
});
