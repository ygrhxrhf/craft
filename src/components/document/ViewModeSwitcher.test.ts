import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The three-way layout switcher (G1119). The official control is three DS buttons in a plain DIV
 * whose selection rides a `Filled`/`Plain` class pair — none of `aria-pressed`, `aria-checked` or
 * `aria-selected` is present on the official buttons.
 */
const source = readFileSync(
  fileURLToPath(new URL('./ViewModeSwitcher.tsx', import.meta.url)),
  'utf8',
);

describe('the switcher offers exactly the three modes', () => {
  it('maps over the shared mode list rather than a local copy', () => {
    expect(source).toContain('VIEW_MODES.map');
    expect(source).not.toContain("'grid', 'list', 'waterfall'");
  });

  it('gives each mode an icon keyed by its id', () => {
    expect(source).toContain('grid: LayoutGrid');
    expect(source).toContain('list: List');
    expect(source).toContain('waterfall: Rows3');
  });
});

describe('the control shape follows the official one', () => {
  it('is a DIV, not a button, and carries the official testid', () => {
    expect(source).toContain('data-testid="browse-layout-toggle"');
    expect(source).toContain('role="group"');
  });

  it('adds aria-pressed as a local accessibility extra, not an official copy', () => {
    expect(source).toContain('aria-pressed={active}');
  });

  it('marks selection with a class pair rather than an attribute the official lacks', () => {
    expect(source).toContain('bg-foreground/[0.08]');
  });
});
