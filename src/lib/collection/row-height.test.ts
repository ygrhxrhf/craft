import { describe, expect, it } from 'vitest';

import {
  ROW_HEIGHT_PX,
  snapToDevicePixels,
  snappedCellPadding,
  snappedRowHeight,
  snappedRowHeightCss,
} from './row-height';

/**
 * G498 —— 行高吸附到整设备像素：`Math.round(px × dpr) / dpr`。
 */
describe('snapping to device pixels (G498)', () => {
  it('leaves integer DPRs untouched', () => {
    expect(snapToDevicePixels(35, 1)).toBe(35);
    expect(snapToDevicePixels(35, 2)).toBe(35);
  });

  it('rounds to the nearest whole device pixel on fractional DPRs', () => {
    // 35 × 1.25 = 43.75 → 44 device px → 35.2 CSS px.
    expect(snapToDevicePixels(35, 1.25)).toBeCloseTo(44 / 1.25, 10);
    // 35 × 1.5 = 52.5 → 53 (half-up) → 35.333…
    expect(snapToDevicePixels(35, 1.5)).toBeCloseTo(53 / 1.5, 10);
    // 35 × 1.75 = 61.25 → 61 → 34.857…
    expect(snapToDevicePixels(35, 1.75)).toBeCloseTo(61 / 1.75, 10);
  });

  it('always lands on a whole number of device pixels', () => {
    for (const dpr of [1, 1.1, 1.25, 1.3, 1.5, 1.75, 2, 2.5, 3]) {
      const device = snapToDevicePixels(ROW_HEIGHT_PX, dpr) * dpr;
      expect(Math.abs(device - Math.round(device)), `dpr ${dpr}`).toBeLessThan(1e-9);
    }
  });

  it('falls back to the input when the DPR is unusable', () => {
    expect(snapToDevicePixels(35, 0)).toBe(35);
    expect(snapToDevicePixels(35, -2)).toBe(35);
    expect(snapToDevicePixels(35, Number.NaN)).toBe(35);
    expect(snapToDevicePixels(Number.NaN, 2)).toBeNaN();
  });

  it('exposes the row height as 35 px at 1x and as a CSS string', () => {
    expect(ROW_HEIGHT_PX).toBe(35);
    expect(snappedRowHeight(1)).toBe(35);
    expect(snappedRowHeightCss(1)).toBe('35px');
    expect(snappedRowHeightCss(1.25)).toBe('35.2px');
  });

  it('snaps the cell padding the same way', () => {
    expect(snappedCellPadding(1)).toBe('10px');
    expect(snappedCellPadding(1.25)).toBe('10.4px');
  });
});