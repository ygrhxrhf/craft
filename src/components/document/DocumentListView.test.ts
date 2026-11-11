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

describe('long lists render through the shared row window (G1123)', () => {
  it('computes the window from the shared helper at the 65px row step', () => {
    expect(source).toContain('visibleRowWindow({');
    expect(source).toContain('rowHeight: LIST_ROW_STEP');
    expect(source).toContain('overscan: 2');
    expect(source).toContain('LIST_VIRTUAL_THRESHOLD = 60');
    // 行高就是步长：行是 65px 且没有 gap，占位高度才对得上滚动位置。
    expect(source).toContain('const LIST_ROW_STEP = 65');
    expect(source).toContain('flex max-h-[480px] flex-col overflow-y-auto');
  });

  it('schedules scroll updates through the shared rAF + debounce helper', () => {
    expect(source).toContain('scheduleScrollUpdate(() => setScrollTop(top))');
    expect(source).toContain('data-testid="browse-list-body"');
  });

  it('renders the top and bottom spacers around the visible slice', () => {
    expect(source).toContain('listWindow.topPad');
    expect(source).toContain('listWindow.bottomPad');
    expect(source).toContain('rows.slice(listWindow.start, listWindow.end)');
  });

  it('keeps the row identity attribute the marquee collects on', () => {
    expect(source).toContain('data-item-id={doc.id}');
  });
});

describe('the typography is declared, not inherited', () => {
  it('hangs the three collected classes on header, title and cell', () => {
    expect(source).toContain('LIST_HEADER_TYPOGRAPHY');
    expect(source).toContain('LIST_TITLE_TYPOGRAPHY');
    expect(source).toContain('LIST_CELL_TYPOGRAPHY');
  });
});

describe('variant C reuses the same slots for 与我共享 (G1115)', () => {
  it('renders 共享/共享者/上次浏览 through the variant-C column table', () => {
    expect(source).toContain('SHARED_LIST_COLUMN_LABELS');
    expect(source).toContain('SHARED_LIST_COLUMN_CLASSES');
    expect(source).toContain('SHARED_COLUMN_WIDTH_VARS');
    expect(source).toContain("variant === 'shared'");
  });

  it('sorts the shared list with the sort.ts vocabulary, not the browse one', () => {
    expect(source).toContain('nextSortForDimension');
    expect(source).toContain('sortDocs');
    expect(source).toContain('onSharedSortChange');
  });

  it('keeps the width sync writing the measured header width', () => {
    expect(source).toContain('const variable = column.widthVar;');
    expect(source).toContain('style.setProperty(variable, columnWidthValue(cell.offsetWidth))');
  });
});
