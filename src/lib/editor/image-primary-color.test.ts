import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_PRIMARY_COLOR_INT,
  averagePrimaryColor,
  primaryColorFromInt,
  primaryColorToInt,
} from './image-primary-color';

describe('the stored shape (G504)', () => {
  it('stores an int and defaults to #f2f2f2', () => {
    expect(primaryColorFromInt(DEFAULT_PRIMARY_COLOR_INT)).toBe(DEFAULT_PRIMARY_COLOR);
    expect(DEFAULT_PRIMARY_COLOR_INT).toBe(0xf2f2f2);
  });

  it('reads only a 24-bit integer as a colour', () => {
    expect(primaryColorFromInt(null)).toBe(DEFAULT_PRIMARY_COLOR);
    expect(primaryColorFromInt('f2f2f2')).toBe(DEFAULT_PRIMARY_COLOR);
    expect(primaryColorFromInt(-1)).toBe(DEFAULT_PRIMARY_COLOR);
    expect(primaryColorFromInt(0x1_00_00_00)).toBe(DEFAULT_PRIMARY_COLOR);
    expect(primaryColorFromInt(1.5)).toBe(DEFAULT_PRIMARY_COLOR);
  });

  // 官方 `toString(16)` 不补前导零；本地这条就是钉住"必须补"。
  it('pads the leading zero that the official reading drops', () => {
    expect(primaryColorFromInt(0x0a1b2c)).toBe('#0a1b2c');
    expect(primaryColorFromInt(0x000000)).toBe('#000000');
    expect(primaryColorFromInt(0xffffff)).toBe('#ffffff');
  });

  it('accepts only a six-digit hex on the way in', () => {
    expect(primaryColorToInt('#0a1b2c')).toBe(0x0a1b2c);
    expect(primaryColorToInt('0a1b2c')).toBe(0x0a1b2c);
    expect(primaryColorToInt('#fff')).toBeNull();
    expect(primaryColorToInt('#gggggg')).toBeNull();
    expect(primaryColorToInt(0xffffff)).toBeNull();
    expect(primaryColorToInt(primaryColorFromInt(0x0a1b2c))).toBe(0x0a1b2c);
  });
});

describe('the average of a pixel block', () => {
  it('averages rgb and skips fully transparent pixels', () => {
    expect(averagePrimaryColor([255, 0, 0, 255, 0, 255, 0, 255])).toBe(0x808000);
    expect(averagePrimaryColor([10, 20, 30, 0, 200, 0, 0, 255])).toBe(0xc80000);
  });

  it('has no colour to report for an empty or fully transparent block', () => {
    expect(averagePrimaryColor([])).toBeNull();
    expect(averagePrimaryColor([1, 2, 3, 0])).toBeNull();
  });
});
