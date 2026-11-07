import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  GROUP_HEADER_HEIGHT,
  OVERSCAN,
  ROW_HEIGHT,
  TABLE_OVERSCAN,
  createVirtualizationLatch,
  estimateRowHeight,
  visibleRowWindow,
} from './virtual-rows';

const tableViewSource = readFileSync(
  join(process.cwd(), 'src/app/(app)/collections/[id]/TableView.tsx'),
  'utf8',
);

describe('the virtual row window (G484 / G273)', () => {
  it('keeps two extra rows on each side', () => {
    const window = visibleRowWindow({ scrollTop: 0, viewportHeight: 360, rowCount: 1000 });
    const visible = Math.ceil(360 / ROW_HEIGHT);
    expect(window.start).toBe(0);
    expect(window.end).toBe(visible + OVERSCAN);
    expect(window.topPad).toBe(0);
    expect(window.bottomPad).toBe((1000 - (visible + OVERSCAN)) * ROW_HEIGHT);
  });

  it('follows the scroll position without leaving gaps', () => {
    const scrollTop = ROW_HEIGHT * 100;
    const window = visibleRowWindow({ scrollTop, viewportHeight: 360, rowCount: 1000 });
    const visible = Math.ceil(360 / ROW_HEIGHT);
    expect(window.start).toBe(100 - OVERSCAN);
    expect(window.end).toBe(100 + visible + OVERSCAN);
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
    // G497：阈值判定挪进只前进不复位的 latch，滚动窗口计算仍归纯核。
    expect(view).toContain('virtualizationLatch.decide(');
    expect(view).toContain('visibleRowWindow({');
    expect(view).toContain('scheduleScrollUpdate(');
  });

  it('renders spacers for the rows it skips', () => {
    expect(view).toContain('renderedItems.map((item: any) => (');
    expect(view).toContain('rowWindow.topPad');
    expect(view).toContain('rowWindow.bottomPad');
  });
});

describe('the table overscan matches the collected table tier (G497)', () => {
  const tableView = readFileSync(
    join(process.cwd(), 'src/app/(app)/collections/[id]/TableView.tsx'),
    'utf8',
  );

  it('uses 25 rows of overscan on the collection table, not the generic 2', () => {
    expect(TABLE_OVERSCAN).toBe(25);
    expect(tableView).toContain('overscan: TABLE_OVERSCAN');
  });
});

/**
 * G497: the official latch is one-way (`set(true)` is the only write in that effect), so shrinking
 * the table does not switch the render path back mid-session; `regressed` carries the "was big, now
 * small" edge on its own, and the row height is a fixed estimate rather than a measurement.
 */
describe('the one-way virtualization latch (G497)', () => {
  it('never falls back once it has engaged', () => {
    const latch = createVirtualizationLatch();
    expect(latch.decide(400, 2).virtualize).toBe(true); // 800 cells > 600
    const after = latch.decide(2, 1);
    expect(after.virtualize, 'deleting rows must not drop back to full rendering').toBe(true);
    expect(after.regressed, 'the degenerate edge is reported separately').toBe(true);
    expect(latch.latched).toBe(true);
  });

  it('stays off while the table is small, and reports no edge', () => {
    const latch = createVirtualizationLatch();
    expect(latch.decide(10, 2)).toEqual({ virtualize: false, regressed: false });
    expect(latch.decide(301, 2)).toEqual({ virtualize: true, regressed: false });
  });

  it('estimates a fixed row height, plus the group header when grouped', () => {
    expect(ROW_HEIGHT).toBe(35);
    expect(estimateRowHeight(false)).toBe(ROW_HEIGHT);
    expect(estimateRowHeight(true)).toBe(ROW_HEIGHT + GROUP_HEADER_HEIGHT);
  });

  it('is wired into the table view, and cleans both pending tasks up on unmount', () => {
    expect(tableViewSource).toContain('createVirtualizationLatch()');
    expect(tableViewSource).toContain('virtualizationLatch.decide(');
    expect(tableViewSource).toContain('rowHeight,');
    expect(tableViewSource).toContain('cancelScrollUpdate.current?.()');
  });
});
