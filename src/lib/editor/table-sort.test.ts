import { describe, expect, it } from 'vitest';

import { compareCells } from './table-sort';

describe('sorting two cells', () => {
  it('orders numbers numerically, so 10 follows 2', () => {
    expect(compareCells('10', '2', 'asc')).toBeGreaterThan(0);
    expect(compareCells('2', '10', 'asc')).toBeLessThan(0);
  });

  it('reverses for descending', () => {
    expect(compareCells('2', '10', 'desc')).toBeGreaterThan(0);
  });

  it('compares text when either side is not a number', () => {
    expect(compareCells('香蕉', '苹果', 'asc')).toBeGreaterThan(0);
    expect(compareCells('2 个', '10', 'asc')).not.toBe(0);
  });

  it('treats a missing cell as empty', () => {
    expect(compareCells(undefined, '', 'asc')).toBe(0);
    expect(compareCells(undefined, '1', 'asc')).toBeLessThan(0);
  });
});
