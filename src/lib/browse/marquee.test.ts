import { describe, expect, it } from 'vitest';

import {
  MARQUEE_START_THRESHOLD,
  isMarqueeDrag,
  marqueeHits,
  rectFromPoints,
  rectsIntersect,
} from './marquee';

// G1135/G1555: the marquee is a strict-intersection hit test with a start threshold.
describe('the marquee geometry', () => {
  it('builds a normalised rect from two points, whichever way the drag went', () => {
    expect(rectFromPoints(100, 100, 50, 40)).toEqual({ left: 50, top: 40, width: 50, height: 60 });
  });

  it('needs the start threshold before it is a drag', () => {
    expect(MARQUEE_START_THRESHOLD).toBe(5);
    expect(isMarqueeDrag({ x: 10, y: 10 }, { x: 13, y: 12 })).toBe(false);
    expect(isMarqueeDrag({ x: 10, y: 10 }, { x: 16, y: 10 })).toBe(true);
  });

  it('does not count a mere edge touch as a hit', () => {
    const band = { left: 0, top: 0, width: 10, height: 10 };
    expect(rectsIntersect(band, { left: 10, top: 0, width: 10, height: 10 })).toBe(false);
    expect(rectsIntersect(band, { left: 9, top: 0, width: 10, height: 10 })).toBe(true);
  });

  it('returns the ids the band covers, in the given order', () => {
    const items = [
      { id: 'a', left: 0, top: 0, width: 20, height: 20 },
      { id: 'b', left: 100, top: 100, width: 20, height: 20 },
      { id: 'c', left: 10, top: 10, width: 20, height: 20 },
    ];
    expect(marqueeHits({ left: 0, top: 0, width: 40, height: 40 }, items)).toEqual(['a', 'c']);
  });
});
