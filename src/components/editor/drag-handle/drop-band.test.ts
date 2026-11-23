import { describe, expect, it } from 'vitest';
import { dropTargetFor, visibleRows } from './drop-band';

// Row geometry read from the official editor: six single-line blocks, row height
// 28 and pitch 36, so each row is followed by an 8px gutter.
const rows = [
  { top: 173, bottom: 201 },
  { top: 209, bottom: 237 },
  { top: 245, bottom: 273 },
  { top: 281, bottom: 309 },
  { top: 317, bottom: 345 },
  { top: 353, bottom: 381 },
];

describe('dropTargetFor', () => {
  it('counts the gutter under a row as that row', () => {
    expect(dropTargetFor(205, rows)).toEqual({ index: 0, before: false });
  });

  it('keeps the midline as the before/after boundary, midpoint included', () => {
    expect(dropTargetFor(187, rows)).toEqual({ index: 0, before: true });
    expect(dropTargetFor(188, rows)).toEqual({ index: 0, before: false });
  });

  it('clamps a drop above the first row to the very front', () => {
    expect(dropTargetFor(150, rows)).toEqual({ index: 0, before: true });
  });

  it('accepts the trailing gutter of the last row', () => {
    expect(dropTargetFor(385, rows)).toEqual({ index: 5, before: false });
  });

  it('has no slot below the last band', () => {
    expect(dropTargetFor(399, rows)).toBeNull();
  });

  it('has no slot without rows', () => {
    expect(dropTargetFor(200, [])).toBeNull();
  });
});

describe('visibleRows (G280)', () => {
  it('drops rows flagged hidden so a folded block is skipped', () => {
    const rows = [
      { top: 0, bottom: 28, visible: true },
      { top: 36, bottom: 64, visible: false },
      { top: 72, bottom: 100, visible: true },
    ];
    expect(visibleRows(rows).map((r) => r.top)).toEqual([0, 72]);
  });

  it('keeps every row when visibility is not annotated', () => {
    expect(visibleRows(rows)).toEqual(rows);
  });
});

import { suppressesIndicator } from './drop-band';

describe('suppressesIndicator (G270)', () => {
  // 被拖的是第 2、3 块（0 基）；组外相邻两格是 before(2) 与 after(3)。
  const dragged = [2, 3];

  it('hides the line over any slot inside the dragged group', () => {
    expect(suppressesIndicator(dragged, 2, true)).toBe(true);
    expect(suppressesIndicator(dragged, 3, true)).toBe(true);
    expect(suppressesIndicator(dragged, 2, false)).toBe(true);
    expect(suppressesIndicator(dragged, 3, false)).toBe(true);
  });

  it('hides the two adjacent no-op slots', () => {
    expect(suppressesIndicator(dragged, 2, true)).toBe(true);   // 组首之前＝原位
    expect(suppressesIndicator(dragged, 3, false)).toBe(true);  // 组尾之后＝原位
  });

  it('keeps the line for real moves outside the group', () => {
    expect(suppressesIndicator(dragged, 0, true)).toBe(false);
    expect(suppressesIndicator(dragged, 1, false)).toBe(false);
    expect(suppressesIndicator(dragged, 4, true)).toBe(false);
    expect(suppressesIndicator(dragged, 5, false)).toBe(false);
  });

  it('hides both neighbours of a single-block drag', () => {
    expect(suppressesIndicator([4], 4, true)).toBe(true);
    expect(suppressesIndicator([4], 3, false)).toBe(false);
    expect(suppressesIndicator([], 4, true)).toBe(false);
  });
});
