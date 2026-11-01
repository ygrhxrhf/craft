import { describe, expect, it } from 'vitest';

import { mergeBlockIds, mergeObjectList, mergeObjectListHeader, mergeSlot, mergeTable, mergeTaskData } from './conflict-merge';

describe('mergeSlot (G442: per-slot merge with fallback)', () => {
  it('uses the merger result when it produces one', () => {
    expect(mergeSlot({ server: 1, local: 2, merge: () => 3 })).toBe(3);
  });

  it('falls back to the server value when the merger returns null', () => {
    expect(mergeSlot({ server: 1, local: 2, merge: () => null })).toBe(1);
    expect(mergeSlot({ server: 1, local: 2, merge: () => undefined })).toBe(1);
  });

  it('falls back to the server value when the merger throws (invalid data does not sink the sync)', () => {
    expect(
      mergeSlot({
        server: 'srv',
        local: 'loc',
        merge: () => {
          throw new Error('Invalid table data');
        },
      }),
    ).toBe('srv');
  });
});

describe('mergeBlockIds (G442: subblock list)', () => {
  it('with a base, keeps both sides\u2019 additions', () => {
    expect(
      mergeBlockIds({ base: ['a'], server: ['a', 's'], local: ['a', 'l'] }).mergedBlockIds,
    ).toEqual(['a', 's', 'l']);
  });

  it('without a base, falls back to server-wins with local non-empty kept', () => {
    expect(mergeBlockIds({ server: ['s1', 's2'], local: ['l1'] }).mergedBlockIds).toEqual(['s1', 's2', 'l1']);
  });

  it('does not duplicate an id that is already on the server', () => {
    expect(mergeBlockIds({ server: ['s1'], local: ['s1', 'l1'] }).mergedBlockIds).toEqual(['s1', 'l1']);
  });
});

describe('mergeObjectList (G442: records + parent schema)', () => {
  it('drops fields the current schema no longer has', () => {
    const merged = mergeObjectList({
      schema: { title: {}, done: {} },
      server: [{ id: 'r1', title: '旧', gone: 1 }],
      local: [{ id: 'r1', title: '新', gone: 2 }],
    });
    expect(merged).toEqual([{ id: 'r1', title: '新' }]);
  });

  it('keeps records only one side has', () => {
    const merged = mergeObjectList({
      schema: { title: {} },
      server: [{ id: 'r1', title: 's' }],
      local: [{ id: 'r2', title: 'l' }],
    });
    expect(merged.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
  });

  it('local wins on a conflicting record', () => {
    const merged = mergeObjectList({
      schema: { title: {} },
      server: [{ id: 'r1', title: 'srv' }],
      local: [{ id: 'r1', title: 'loc' }],
    });
    expect(merged).toEqual([{ id: 'r1', title: 'loc' }]);
  });
});

describe('mergeTable (G442: table eats mergedBlockIds)', () => {
  it('reorders rows to follow the merged subblock order', () => {
    const merged = mergeTable({
      serverRows: [{ id: 'rowA' }],
      localRows: [{ id: 'rowB' }],
      mergedBlockIds: ['rowB', 'rowA'],
    });
    // The rows follow the just-merged subblock order, not the server order.
    expect(merged).toEqual([{ id: 'rowB' }, { id: 'rowA' }]);
  });

  it('falls back to {} when the table data is invalid, as the official does', () => {
    expect(mergeTable({ serverRows: null, localRows: [1], mergedBlockIds: [] })).toEqual({});
  });

  it('uses the server rows when the local side is not an array', () => {
    const rows = [{ id: 'rowA' }];
    expect(mergeTable({ serverRows: rows, localRows: null, mergedBlockIds: [] })).toBe(rows);
  });
});

describe('the object-list header merger (G442/G608)', () => {
  it('keeps fields added on either side', () => {
    const merged = mergeObjectListHeader({
      local: { schema: { a: {}, c: {} } },
      server: { schema: { a: {}, b: {} } },
    });
    expect(Object.keys(merged.schema).sort()).toEqual(['a', 'b', 'c']);
  });

  it('the server definition wins on a shared key', () => {
    const merged = mergeObjectListHeader({ local: { schema: { a: { from: 'local' } } }, server: { schema: { a: { from: 'server' } } } });
    expect(merged.schema.a).toEqual({ from: 'server' });
  });

  it('unions the views, server order first', () => {
    const merged = mergeObjectListHeader({ local: { views: [{ id: 'v2' }] }, server: { views: [{ id: 'v1' }] } });
    expect(merged.views).toEqual([{ id: 'v1' }, { id: 'v2' }]);
  });
});

describe('the task merger (G442)', () => {
  it('is null when neither side is a task', () => {
    expect(mergeTaskData({ local: null, server: null })).toBeNull();
  });

  it('either side being a task is enough', () => {
    expect(mergeTaskData({ local: { done: true }, server: null })).toEqual({ done: true });
    expect(mergeTaskData({ local: null, server: { done: false } })).toEqual({ done: false });
  });

  it('merges per field with local winning on a shared key', () => {
    const merged = mergeTaskData({ local: { due: 'd2', title: 'l' }, server: { due: 'd1', schedule: 's1' } });
    expect(merged).toEqual({ due: 'd2', schedule: 's1', title: 'l' });
  });
});
