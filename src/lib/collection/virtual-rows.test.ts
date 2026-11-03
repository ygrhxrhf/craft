import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { OVERSCAN, ROW_HEIGHT, visibleRowWindow } from './virtual-rows';

describe('the virtual row window (G484 / G273)', () => {
  it('keeps two extra rows on each side', () => {
    const window = visibleRowWindow({ scrollTop: 0, viewportHeight: 360, rowCount: 1000 });
    expect(window.start).toBe(0);
    expect(window.end).toBe(10 + OVERSCAN);
    expect(window.topPad).toBe(0);
    expect(window.bottomPad).toBe((1000 - (10 + OVERSCAN)) * ROW_HEIGHT);
  });

  it('follows the scroll position without leaving gaps', () => {
    const scrollTop = 36 * 100;
    const window = visibleRowWindow({ scrollTop, viewportHeight: 360, rowCount: 1000 });
    expect(window.start).toBe(100 - OVERSCAN);
    expect(window.end).toBe(110 + OVERSCAN);
    expect(window.topPad).toBe((100 - OVERSCAN) * ROW_HEIGHT);
  });

  it('never runs past the ends on short tables', () => {
    const window = visibleRowWindow({ scrollTop: 0, viewportHeight: 360, rowCount: 5 });
    expect(window.start).toBe(0);
    expect(window.end).toBe(5);
    expect(window.bottomPad).toBe(0);
    expect(visibleRowWindow({ scrollTop: 0, viewportHeight: 360, rowCount: 0 })).toEqual({
      start: 0,
      end: 0,
      topPad: 0,
      bottomPad: 0,
    });
  });
});

describe('the table view wires the window (G484)', () => {
  const view = readFileSync(
    join(process.cwd(), 'src/app/(app)/collections/[id]/TableView.tsx'),
    'utf8',
  );

  it('only virtualises past the 600-cell threshold and keeps the scroll math in the helper', () => {
    expect(view).toContain('exceedsVirtualTableThreshold(processedItems.length, visibleProperties.length)');
    expect(view).toContain('visibleRowWindow({ scrollTop, viewportHeight');
    expect(view).toContain('scheduleScrollUpdate(');
  });

  it('renders spacers for the rows it skips', () => {
    expect(view).toContain('renderedItems.map((item: any) => (');
    expect(view).toContain('rowWindow.topPad');
    expect(view).toContain('rowWindow.bottomPad');
  });
});
