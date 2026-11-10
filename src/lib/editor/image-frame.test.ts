import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FRAME,
  ASPECT_TIER_ORDER,
  frameStyle,
  matchAspectTier,
  moveFrame,
  readImageFrame,
  zoomFrame,
} from './image-frame';

describe('reading a stored frame', () => {
  it('centers an image that has never been framed', () => {
    expect(readImageFrame({})).toEqual(DEFAULT_FRAME);
  });

  it('drops a value that is not a finite number', () => {
    expect(readImageFrame({ posX: 'left', posY: NaN, scale: Infinity })).toEqual(DEFAULT_FRAME);
  });

  it('clamps a stored value back inside the frame', () => {
    expect(readImageFrame({ posX: 140, posY: -20, scale: 9 })).toEqual({ x: 100, y: 0, scale: 3 });
  });
});

describe('dragging', () => {
  it('moves the image against the pointer, as a share of the frame', () => {
    expect(moveFrame(DEFAULT_FRAME, 50, -25, 200, 100)).toEqual({ x: 25, y: 75, scale: 1 });
  });

  it('stops at the edge instead of wrapping past it', () => {
    expect(moveFrame({ x: 10, y: 90, scale: 1 }, 1000, -1000, 200, 100)).toEqual({
      x: 0,
      y: 100,
      scale: 1,
    });
  });

  it('ignores a drag reported against a frameless box', () => {
    expect(moveFrame(DEFAULT_FRAME, 10, 10, 0, 0)).toEqual(DEFAULT_FRAME);
  });
});

describe('zooming', () => {
  it('steps by a quarter and stops at both ends', () => {
    expect(zoomFrame(DEFAULT_FRAME, 1).scale).toBe(1.25);
    expect(zoomFrame(DEFAULT_FRAME, -1).scale).toBe(1);
    expect(zoomFrame({ ...DEFAULT_FRAME, scale: 3 }, 1).scale).toBe(3);
  });

  it('renders the default without a transform', () => {
    expect(frameStyle(DEFAULT_FRAME)).toEqual({ objectPosition: '50% 50%', transform: 'none' });
    expect(frameStyle({ x: 0, y: 100, scale: 2 })).toEqual({
      objectPosition: '0% 100%',
      transform: 'scale(2)',
    });
  });
});

describe('aspect ratio tiers (G1417)', () => {
  it('keeps the six official tiers in order', () => {
    expect(ASPECT_TIER_ORDER).toEqual(['default', 'freeform', '16:9', '2:1', '3:1', '4:3']);
  });

  it('matches a ratio inside the 0.1 tolerance to a fixed tier', () => {
    expect(matchAspectTier(16 / 9)).toBe('16:9');
    expect(matchAspectTier(2)).toBe('2:1');
    expect(matchAspectTier(3)).toBe('3:1');
    expect(matchAspectTier(4 / 3)).toBe('4:3');
    expect(matchAspectTier(1.5, 1.5)).toBe('default');
  });

  it('uses a strict tolerance — 0.1 or greater is not a match', () => {
    expect(matchAspectTier(2.1)).toBe('freeform');
    expect(matchAspectTier(2.099)).toBe('2:1');
    expect(matchAspectTier(1.901)).toBe('2:1');
    expect(matchAspectTier(1.9)).toBe('freeform');
  });

  it('falls back to freeform for a ratio belonging to no tier', () => {
    expect(matchAspectTier(1)).toBe('freeform');
    expect(matchAspectTier(2.5)).toBe('freeform');
    expect(matchAspectTier(0.5)).toBe('freeform');
  });

  it('never matches freeform itself, which carries no value', () => {
    expect(matchAspectTier(Number.NaN)).toBe('freeform');
  });

  it('resolves the default tier from the block aspect ratio, not a constant', () => {
    expect(matchAspectTier(1.5, 1.5)).toBe('default');
    expect(matchAspectTier(1.5, 1.4)).toBe('freeform');
  });
});
