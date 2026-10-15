import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The browse list layout (G1113 / G1115 / G1117). The official row renders all four cells and lets
 * CSS hide three of them, and it lines a data cell up with its header by pushing the header's
 * measured width onto the container. Both are structural, so they are read off the source.
 */
const source = readFileSync(
  fileURLToPath(new URL('./DocumentListView.tsx', import.meta.url)),
  'utf8',
);

describe('the list renders every cell and defers visibility to CSS', () => {
  it('hides the three data columns behind the slot classes', () => {
    expect(source).toContain('LIST_COLUMN_CLASSES.lastViewed');
    expect(source).toContain('LIST_COLUMN_CLASSES.updated');
    expect(source).toContain('LIST_COLUMN_CLASSES.created');
    expect(source).not.toContain("viewMode === 'list' &&");
  });

  it('does not gate a cell on the column being visible in JS', () => {
    // Visibility lives in the container query, not in a conditional — the official shell always
    // renders the six DIVs and only ever checks `leading != null` (G1115).
    expect(source).not.toMatch(/doc\.lastViewedAt\s*&&\s*</);
  });
});

describe('the column width sync follows the official two-place pattern', () => {
  it('writes the header width onto the container as a custom property', () => {
    expect(source).toContain('style.setProperty(variable, columnWidthValue(cell.offsetWidth))');
  });

  it('measures once up front and then on resize', () => {
    expect(source).toContain('ResizeObserver');
    expect(source.indexOf('sync();')).toBeLessThan(source.indexOf('new ResizeObserver'));
  });

  it('observes the header cells, not the rows', () => {
    expect(source).toContain('observer.observe(cell)');
  });

  it('reads each width back with the official 112px fallback', () => {
    expect(source).toContain('var(--col-last-viewed-width,112px)');
    expect(source).toContain('var(--col-updated-width,112px)');
    expect(source).toContain('var(--col-created-width,112px)');
  });
});

describe('the row height is the collected 65', () => {
  it('pins the row to 65px', () => {
    expect(source).toContain('height: 65');
  });
});

describe('the typography is declared, not inherited', () => {
  it('hangs the three collected classes on header, title and cell', () => {
    expect(source).toContain('LIST_HEADER_TYPOGRAPHY');
    expect(source).toContain('LIST_TITLE_TYPOGRAPHY');
    expect(source).toContain('LIST_CELL_TYPOGRAPHY');
  });
});
