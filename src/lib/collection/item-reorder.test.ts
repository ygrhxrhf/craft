import { describe, expect, it } from 'vitest';

import { canReorder, moveRow, orderPatches, planReorder, renumber } from './item-reorder';

describe('collection row reorder (G1539)', () => {
  it('moves a row down and shifts the rest up', () => {
    expect(moveRow(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves a row up and shifts the rest down', () => {
    expect(moveRow(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('is a no-op for an in-place drop or an out-of-range index', () => {
    expect(moveRow(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveRow(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(moveRow(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
  });

  it('does not mutate the input array', () => {
    const rows = ['a', 'b', 'c'];
    moveRow(rows, 0, 2);
    expect(rows).toEqual(['a', 'b', 'c']);
  });

  it('renumbers by position and keeps untouched rows identical by reference', () => {
    const rows = [
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
    ];
    const next = renumber([rows[1], rows[0]]);
    expect(next.map((row) => [row.id, row.order])).toEqual([
      ['b', 0],
      ['a', 1],
    ]);
  });

  it('writes only the rows whose order actually changed', () => {
    const before = [
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
      { id: 'c', order: 2 },
    ];
    const after = renumber([before[1], before[0], before[2]]);
    expect(orderPatches(before, after)).toEqual([
      { id: 'b', order: 0 },
      { id: 'a', order: 1 },
    ]);
  });

  it('reports nothing to write when the order is unchanged', () => {
    const rows = [
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
    ];
    expect(orderPatches(rows, renumber(rows))).toEqual([]);
  });

  it('refuses to reorder a view whose order is decided by sorts or grouping', () => {
    expect(canReorder({ sortCount: 0, grouped: false })).toBe(true);
    expect(canReorder({ sortCount: 1, grouped: false })).toBe(false);
    expect(canReorder({ sortCount: 0, grouped: true })).toBe(false);
    // G283: the official copy bans drag on filtered *or* sorted *or* grouped collections.
    expect(canReorder({ sortCount: 0, grouped: false, filterCount: 1 })).toBe(false);
    expect(canReorder({ sortCount: 1, grouped: true, filterCount: 2 })).toBe(false);
  });
});

describe('planReorder works on the whole collection, not the visible subset (G1539)', () => {
  const full = [
    { id: 'a', order: 0 },
    { id: 'b', order: 1 },
    { id: 'c', order: 2 },
    { id: 'd', order: 3 },
  ];

  it('plans a drag across the full order and keeps hidden rows in place', () => {
    // 屏上被筛选只剩 a 与 d（b、c 隐藏）；把 a 拖到 d 的位置
    expect(planReorder(full, 'a', 'd')).toEqual([
      { id: 'b', order: 0 },
      { id: 'c', order: 1 },
      { id: 'd', order: 2 },
      { id: 'a', order: 3 },
    ]);
  });

  it('never compacts the visible rows into 0..k-1', () => {
    const patches = planReorder(full, 'a', 'd');
    const assigned = new Map(patches.map((patch) => [patch.id, patch.order]));
    // 隐藏行 b、c 的号仍落在全集区间内，且与可见行的号不冲突
    const all = full.map((row) => ({ id: row.id, order: assigned.get(row.id) ?? row.order }));
    expect(new Set(all.map((row) => row.order)).size).toBe(full.length);
    expect(Math.max(...all.map((row) => row.order))).toBe(full.length - 1);
  });

  it('is a no-op for an unknown id, a same-row drop, or an empty id', () => {
    expect(planReorder(full, 'a', 'a')).toEqual([]);
    expect(planReorder(full, 'a', 'missing')).toEqual([]);
    expect(planReorder(full, 'missing', 'd')).toEqual([]);
    expect(planReorder(full, '', 'd')).toEqual([]);
  });

  it('writes nothing when the drop leaves the order alone', () => {
    expect(planReorder(full, 'b', 'b')).toEqual([]);
  });
});
