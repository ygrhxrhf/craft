import { describe, expect, it } from 'vitest';

import {
  EXPORT_BACKGROUND,
  EXPORT_PADDING,
  RESIZE_DEBOUNCE_MS,
  canRedraw,
  containScale,
  redrawOnVisibilityChange,
} from './whiteboard-preview';

// G448: the embed is a static export with fixed parameters and four redraw gates.
describe('the whiteboard preview', () => {
  it('uses the fixed export parameters', () => {
    expect(EXPORT_PADDING).toBe(32);
    expect(EXPORT_BACKGROUND).toBe(false);
    expect(RESIZE_DEBOUNCE_MS).toBe(300);
  });

  it('scales the board to fit, keeping its ratio', () => {
    // A wide board in a square box is limited by width.
    expect(containScale({ width: 200, height: 100 }, { width: 100, height: 100 })).toBe(0.5);
    // A tall board is limited by height.
    expect(containScale({ width: 100, height: 200 }, { width: 100, height: 100 })).toBe(0.5);
    expect(containScale({ width: 0, height: 10 }, { width: 10, height: 10 })).toBe(0);
  });

  it('requires all four gates', () => {
    const open = { tabVisible: true, noBlockEditing: true, dataReady: true, sizeKnown: true };
    expect(canRedraw(open)).toBe(true);
    for (const gate of Object.keys(open) as (keyof typeof open)[]) {
      expect(canRedraw({ ...open, [gate]: false })).toBe(false);
    }
  });

  it('owes one redraw when a hidden tab becomes visible again', () => {
    const ready = { noBlockEditing: true, dataReady: true, sizeKnown: true };
    expect(redrawOnVisibilityChange(true, ready)).toBe(true);
    expect(redrawOnVisibilityChange(false, ready)).toBe(false);
    expect(redrawOnVisibilityChange(true, { ...ready, dataReady: false })).toBe(false);
  });
});
