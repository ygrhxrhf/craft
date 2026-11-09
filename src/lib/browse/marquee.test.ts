import { describe, expect, it } from 'vitest';

import {
  AUTO_SCROLL_EDGE,
  AUTO_SCROLL_MAX_SPEED,
  MARQUEE_IGNORE_SELECTOR,
  MARQUEE_START_THRESHOLD,
  autoScrollVelocity,
  isMarqueeDrag,
  isMarqueeVetoTarget,
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

// G1135 ①/③: the veto selector and the 1.5-power auto-scroll ramp are verbatim official.
describe('the marquee start veto and edge auto-scroll', () => {
  it('refuses to start on a card, link, control or text field', () => {
    expect(MARQUEE_IGNORE_SELECTOR).toBe(
      "[data-item-id], a, button, input, textarea, select, [contenteditable='true']",
    );
    const closest = (hit: string | null) => ({ closest: () => hit }) as unknown as Element;
    expect(isMarqueeVetoTarget(closest('[data-item-id]'))).toBe(true);
    expect(isMarqueeVetoTarget(closest('button'))).toBe(true);
    expect(isMarqueeVetoTarget(closest(null))).toBe(false);
    expect(isMarqueeVetoTarget(null)).toBe(false);
  });

  it('ramps the edge scroll in with a 1.5 power, capped at 30px per frame', () => {
    expect(AUTO_SCROLL_EDGE).toBe(200);
    expect(AUTO_SCROLL_MAX_SPEED).toBe(30);
    // Inside the viewport there is no scroll at all.
    expect(autoScrollVelocity(500, 100, 900)).toBe(0);
    // At the edge the ramp starts from zero rather than jumping to full speed.
    expect(autoScrollVelocity(901, 100, 900)).toBeLessThan(1);
    // 200px past the edge is the ceiling.
    expect(autoScrollVelocity(1_100, 100, 900)).toBeCloseTo(30, 6);
    expect(autoScrollVelocity(-100, 100, 900)).toBeCloseTo(-30, 6);
    // Halfway, `(100/200)^1.5 = 0.3536` — a linear ramp would say 0.5.
    expect(autoScrollVelocity(1_000, 100, 900)).toBeCloseTo(30 * Math.pow(0.5, 1.5), 6);
  });
});
