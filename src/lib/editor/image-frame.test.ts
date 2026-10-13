import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FRAME,
  frameStyle,
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
