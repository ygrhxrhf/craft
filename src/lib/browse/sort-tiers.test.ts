import { describe, expect, it } from 'vitest';
import { compareByTier, sortByTier, tierValue, isBrowseSortTier, BROWSE_SORT_TIERS } from './sort-tiers';

describe('BROWSE_SORT_TIERS (G348: the six-tier enum)', () => {
  it('has the six official keys', () => {
    expect([...BROWSE_SORT_TIERS]).toEqual(['name', 'updated', 'created', 'lastViewed', 'kind', 'manual']);
  });

  it('recognises exactly those keys', () => {
    expect(isBrowseSortTier('kind')).toBe(true);
    expect(isBrowseSortTier('manual')).toBe(true);
    expect(isBrowseSortTier('shared')).toBe(false);
  });
});

describe('compareByTier (G348: empty last + natural collation)', () => {
  it('sorts names naturally — Doc2 before Doc10', () => {
    const rows = [{ title: 'Doc10' }, { title: 'Doc2' }];
    expect(sortByTier(rows, 'name').map((r) => r.title)).toEqual(['Doc2', 'Doc10']);
  });

  it('ignores case and accents (sensitivity: base)', () => {
    const rows = [{ title: 'apple' }, { title: 'Banana' }];
    expect(sortByTier(rows, 'name').map((r) => r.title)).toEqual(['apple', 'Banana']);
  });

  it('pins empty values last in ascending order', () => {
    const rows = [{ title: null }, { title: 'b' }, { title: 'a' }];
    expect(sortByTier(rows, 'name').map((r) => r.title)).toEqual(['a', 'b', null]);
  });

  it('keeps empty values last in **descending** order too — "empty" is not inverted', () => {
    const rows = [{ title: null }, { title: 'b' }, { title: 'a' }];
    expect(sortByTier(rows, 'name', 'descending').map((r) => r.title)).toEqual(['b', 'a', null]);
  });

  it('manual sorts by the numeric order, with order 0 kept (0 is not empty)', () => {
    const rows = [{ order: 2 }, { order: 0 }, { order: 1 }];
    expect(sortByTier(rows, 'manual').map((r) => r.order)).toEqual([0, 1, 2]);
  });

  it('manual pins a missing order last', () => {
    const rows = [{ order: null }, { order: 5 }];
    expect(sortByTier(rows, 'manual').map((r) => r.order)).toEqual([5, null]);
  });

  it('kind sorts by the kind string', () => {
    const rows = [{ kind: 'whiteboard' }, { kind: 'collection' }, { kind: 'page' }];
    expect(sortByTier(rows, 'kind').map((r) => r.kind)).toEqual(['collection', 'page', 'whiteboard']);
  });

  it('tierValue treats an empty string as empty, and returns null for absent fields', () => {
    expect(tierValue({ title: '' }, 'name')).toBe('');
    expect(tierValue({}, 'updated')).toBeNull();
    expect(compareByTier({ title: '' }, { title: 'a' }, 'name')).toBe(1);
  });
});
