import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SORT,
  SORT_DIMENSIONS,
  SORT_DIRECTIONS,
  compareDocs,
  isSortDimension,
  isSortDirection,
  sortDocs,
  type SortableDoc,
} from './sort';

const doc = (over: Partial<SortableDoc> & { title: string }): SortableDoc => ({
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('the official sort enum', () => {
  it('crosses every dimension with two directions', () => {
    // G1091's four (name/shared/sharedBy/lastViewed) plus the two the all-documents toolbar
    // adds for this screen (created/updated, G223).
    expect([...SORT_DIMENSIONS]).toEqual(['name', 'shared', 'sharedBy', 'lastViewed', 'created', 'updated']);
    expect([...SORT_DIRECTIONS]).toEqual(['ascending', 'descending']);
  });

  it('defaults to most recently viewed first', () => {
    expect(DEFAULT_SORT).toEqual({ dimension: 'lastViewed', direction: 'descending' });
  });

  it('guards unknown values', () => {
    expect(isSortDimension('name')).toBe(true);
    expect(isSortDimension('size')).toBe(false);
    expect(isSortDirection('ascending')).toBe(true);
    expect(isSortDirection('sideways')).toBe(false);
  });
});

describe('ordering', () => {
  const a = doc({ title: '苹果', updatedAt: '2026-01-03T00:00:00.000Z' });
  const b = doc({ title: 'banana', updatedAt: '2026-01-01T00:00:00.000Z' });
  const c = doc({ title: 'Cherry', updatedAt: '2026-01-02T00:00:00.000Z' });

  it('sorts by name with the collator, and the two directions are reverses', () => {
    const asc = sortDocs([c, a, b], { dimension: 'name', direction: 'ascending' });
    const desc = sortDocs([c, a, b], { dimension: 'name', direction: 'descending' });
    // The exact position of a CJK name is locale-dependent, so the assertion is that the two
    // directions mirror each other rather than a hard-coded order.
    expect(desc.map((d) => d.title)).toEqual([...asc].reverse().map((d) => d.title));
    // An ASCII pair is locale-stable: banana precedes Cherry under the collator.
    expect(asc.findIndex((d) => d.title === 'banana')).toBeLessThan(
      asc.findIndex((d) => d.title === 'Cherry'),
    );
  });

  it('sorts by last viewed, falling back to updated when never viewed', () => {
    const viewed = doc({ title: 'x', lastViewedAt: '2026-02-01T00:00:00.000Z' });
    const rows = sortDocs([a, b, viewed], { dimension: 'lastViewed', direction: 'descending' });
    expect(rows[0].title).toBe('x');
  });

  it('sorts the toolbar’s 创建日期 / 更新日期 orders', () => {
    const older = doc({ title: 'old', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z' });
    const newer = doc({ title: 'new', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z' });
    expect(sortDocs([older, newer], { dimension: 'created', direction: 'descending' }).map((d) => d.title))
      .toEqual(['new', 'old']);
    expect(sortDocs([older, newer], { dimension: 'updated', direction: 'descending' }).map((d) => d.title))
      .toEqual(['old', 'new']);
  });

  it('puts unshared before shared ascending', () => {
    const shared = doc({ title: 's', shared: true });
    const own = doc({ title: 'o', shared: false });
    const rows = sortDocs([shared, own], { dimension: 'shared', direction: 'ascending' });
    expect(rows.map((d) => d.title)).toEqual(['o', 's']);
  });

  it('sorts a missing sharer after a present one in ascending order', () => {
    const named = doc({ title: 'n', sharedBy: 'ann' });
    const anonymous = doc({ title: 'a', sharedBy: null });
    const rows = sortDocs([anonymous, named], { dimension: 'sharedBy', direction: 'ascending' });
    expect(rows.map((d) => d.title)).toEqual(['n', 'a']);
  });

  it('does not mutate the caller array', () => {
    const input = [c, a, b];
    const copy = [...input];
    sortDocs(input, { dimension: 'name', direction: 'ascending' });
    expect(input).toEqual(copy);
  });

  it('is a total order: comparing a doc with itself is zero', () => {
    expect(compareDocs(a, a, DEFAULT_SORT)).toBe(0);
  });
});
