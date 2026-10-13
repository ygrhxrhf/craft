import { describe, expect, it } from 'vitest';

import { compareForSort } from './sort-compare';

const asc = (a: unknown, b: unknown) => compareForSort(a, b, 'asc');
const desc = (a: unknown, b: unknown) => compareForSort(a, b, 'desc');

describe('compareForSort', () => {
  it('is numeric-aware: item2 sorts before item10', () => {
    expect(asc('item2', 'item10')).toBeLessThan(0);
    expect(desc('item2', 'item10')).toBeGreaterThan(0);
    expect(asc('2', '10')).toBeLessThan(0);
  });

  it('ignores case', () => {
    expect(asc('banana', 'Apple')).toBeGreaterThan(0);
    expect(asc('Apple', 'banana')).toBeLessThan(0);
    expect(asc('apple', 'Apple')).toBe(0);
  });

  it('keeps blanks first in both directions', () => {
    expect(asc(null, 'a')).toBeLessThan(0);
    expect(desc(null, 'a')).toBeLessThan(0);
    expect(asc('', 'a')).toBeLessThan(0);
    expect(desc('', 'a')).toBeLessThan(0);
    expect(asc(undefined, null)).toBe(0);
  });

  it('orders three mixed rows the same way the ledger describes', () => {
    const rows = ['10', null, '2'];
    const sorted = [...rows].sort((a, b) => compareForSort(a, b, 'asc'));
    expect(sorted).toEqual([null, '2', '10']);
  });
});
