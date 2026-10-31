import { describe, expect, it } from 'vitest';
import { nearestSnapIndex, normalizeSnapPoints } from './snap-points';

describe('drawer snap points (G37)', () => {
  it('keeps only valid fractions, sorts and dedupes', () => {
    expect(normalizeSnapPoints([0.6, 0.35, 0.6, 0, 1, -1, 1.2])).toEqual([0.35, 0.6]);
  });

  it('needs at least two points to snap', () => {
    expect(normalizeSnapPoints([0.6])).toEqual([]);
    expect(normalizeSnapPoints(undefined)).toEqual([]);
  });

  it('picks the nearest point', () => {
    expect(nearestSnapIndex(0.34, [0.35, 0.6, 0.92])).toBe(0);
    expect(nearestSnapIndex(0.61, [0.35, 0.6, 0.92])).toBe(1);
    expect(nearestSnapIndex(0.9, [0.35, 0.6, 0.92])).toBe(2);
  });
});
