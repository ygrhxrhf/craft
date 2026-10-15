import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BROWSE_SORT_SPEC,
  LIST_SORT_COLUMNS,
  ariaSortValue,
  compareBrowseRows,
  nextSortSpec,
  sortArrow,
  sortBrowseRows,
  sortColumnFor,
  type SortableRow,
} from './list-sort';

/**
 * G247: the list's four column headers are the sorters, the active one carries a direction arrow,
 * and the four columns map one-to-one onto the screen's four orders.
 */
const row = (over: Partial<SortableRow> & { title: string }): SortableRow => ({
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('the four columns', () => {
  it('render in the observed order and bind to the four orders', () => {
    expect(LIST_SORT_COLUMNS.map((c) => c.option)).toEqual([
      'name',
      'lastViewed',
      'updated',
      'created',
    ]);
    expect(LIST_SORT_COLUMNS.map((c) => c.label)).toEqual([
      '名称',
      '上次浏览',
      '已更新',
      '已创建',
    ]);
  });

  it('every column resolves back from its order', () => {
    for (const column of LIST_SORT_COLUMNS) {
      expect(sortColumnFor(column.option)).toEqual(column);
    }
  });

  it('defaults to 已更新 descending, the direction the screen shows', () => {
    expect(DEFAULT_BROWSE_SORT_SPEC).toEqual({ option: 'updated', direction: 'descending' });
    expect(sortArrow(DEFAULT_BROWSE_SORT_SPEC, 'updated')).toBe('↓');
  });
});

describe('clicking a header', () => {
  it('flips the direction of the active column', () => {
    const flipped = nextSortSpec({ option: 'updated', direction: 'descending' }, 'updated');
    expect(flipped).toEqual({ option: 'updated', direction: 'ascending' });
    expect(nextSortSpec(flipped, 'updated')).toEqual({
      option: 'updated',
      direction: 'descending',
    });
  });

  it('switches to a new column and starts descending', () => {
    expect(nextSortSpec({ option: 'updated', direction: 'ascending' }, 'name')).toEqual({
      option: 'name',
      direction: 'descending',
    });
  });
});

describe('the arrow and aria-sort agree', () => {
  const spec = { option: 'created', direction: 'ascending' } as const;

  it('marks only the active column', () => {
    expect(sortArrow(spec, 'created')).toBe('↑');
    expect(sortArrow(spec, 'name')).toBeNull();
    expect(ariaSortValue(spec, 'created')).toBe('ascending');
    expect(ariaSortValue(spec, 'name')).toBe('none');
  });
});

describe('ordering', () => {
  const a = row({ title: '苹果', updatedAt: '2026-01-03T00:00:00.000Z' });
  const b = row({ title: 'banana', updatedAt: '2026-01-01T00:00:00.000Z' });
  const c = row({ title: 'Cherry', updatedAt: '2026-01-02T00:00:00.000Z' });

  it('sorts by name with the shared collator, and the directions mirror', () => {
    const asc = sortBrowseRows([c, a, b], { option: 'name', direction: 'ascending' });
    const desc = sortBrowseRows([c, a, b], { option: 'name', direction: 'descending' });
    // The exact position of a CJK name is locale-dependent, so the assertion is that the two
    // directions mirror each other plus one locale-stable ASCII pair.
    expect(desc.map((r) => r.title)).toEqual([...asc].reverse().map((r) => r.title));
    expect(asc.findIndex((r) => r.title === 'banana')).toBeLessThan(
      asc.findIndex((r) => r.title === 'Cherry'),
    );
  });

  it('sorts by updated, newest first when descending', () => {
    const rows = sortBrowseRows([b, c, a], { option: 'updated', direction: 'descending' });
    expect(rows.map((r) => r.title)).toEqual(['苹果', 'Cherry', 'banana']);
  });

  it('falls back to the update time for lastViewed and created', () => {
    expect(compareBrowseRows(a, b, { option: 'lastViewed', direction: 'ascending' })).toBeGreaterThan(0);
    expect(compareBrowseRows(a, b, { option: 'created', direction: 'ascending' })).toBeGreaterThan(0);
  });

  it('never mutates the caller array', () => {
    const input = [b, c, a];
    sortBrowseRows(input, { option: 'name', direction: 'ascending' });
    expect(input.map((r) => r.title)).toEqual(['banana', 'Cherry', '苹果']);
  });
});
