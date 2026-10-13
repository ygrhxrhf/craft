import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The collection table interface (G1075). 21 `--st-*` variables plus a seven-step z ladder. The
 * ladder ordering is the point: intersection cell (7) above header (6) above index column (3),
 * with the column-resize preview above everything.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
const table = readFileSync(
  fileURLToPath(new URL('../../app/(app)/collections/[id]/TableView.tsx', import.meta.url)),
  'utf8',
);

describe('the table variables', () => {
  it('declares the layout values verbatim', () => {
    expect(css).toContain('--st-row-height: 35px;');
    expect(css).toContain('--st-index-column-width: 45px;');
    expect(css).toContain('--st-cell-padding-x: 10px;');
    expect(css).toContain('--st-cell-padding-y: 4px;');
    expect(css).toContain('--st-border-radius: 5px;');
    expect(css).toContain('--st-max-height: 560px;');
    expect(css).toContain('--st-card-title-line-height: 21px;');
  });

  it('keeps the four host-injected values at initial rather than inventing defaults', () => {
    expect(css).toContain('--st-text-color: initial;');
    expect(css).toContain('--st-page-bg: initial;');
  });

  it('orders the seven-step z ladder', () => {
    expect(css).toContain('--st-z-base-cell: 1;');
    expect(css).toContain('--st-z-index-cell-header: 2;');
    expect(css).toContain('--st-z-sticky-index: 3;');
    expect(css).toContain('--st-z-sticky-header: 6;');
    expect(css).toContain('--st-z-sticky-header-index: 7;');
    expect(css).toContain('--st-z-interactive-overlay: 10;');
    expect(css).toContain('--st-z-resize-preview: 12;');
  });

  it('reads the header and intersection layers from the ladder', () => {
    expect(table).toContain('z-[var(--st-z-sticky-header)]');
    expect(table).toContain('z-[var(--st-z-sticky-header-index)]');
  });

  it('reads cell padding and row height from the variables', () => {
    expect(table).toContain('px-[var(--st-cell-padding-x)]');
    expect(table).toContain('py-[var(--st-cell-padding-y)]');
    expect(table).toContain('h-[var(--st-row-height)]');
  });
});
