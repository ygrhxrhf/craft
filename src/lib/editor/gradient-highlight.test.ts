import { describe, expect, it } from 'vitest';

import {
  DEFAULT_HIGHLIGHT_DEGREE,
  GRADIENT_PRESETS,
  colorPair,
  gradientCss,
  parseGradient,
  presetValue,
  serializeGradient,
} from './gradient-highlight';

/**
 * G532：高亮是 90° 线性渐变，线格式 `<色1>;<色2>;<色3>g`；色标百分比按索引均分，
 * 每个色标是明暗对；单色标退化成普通色，全脏回 null。
 */
describe('the gradient highlight line format (G532)', () => {
  it('ends the line with the `g` marker and splits stops with semicolons', () => {
    expect(serializeGradient([{ light: 'a', dark: 'b' }, { light: 'c', dark: 'd' }])).toBe('a/b;c/d;g');
    // 明暗相同时只写一次（官方那一格就是一个值带两档）。
    expect(serializeGradient([{ light: 'a', dark: 'a' }, { light: 'c', dark: 'c' }])).toBe('a;c;g');
  });

  it('parses the line back into stops whose percentages are split by index', () => {
    const gradient = parseGradient('red;blue;green;g');
    expect(gradient).not.toBeNull();
    expect(gradient!.type).toBe('linear');
    expect(gradient!.degree).toBe(DEFAULT_HIGHLIGHT_DEGREE);
    expect(gradient!.colorStops.map((stop) => stop.percent100)).toEqual([0, 50, 100]);
    expect(gradient!.colorStops[0]).toMatchObject({ light: 'red', dark: 'red' });

    // 明暗对要各自保留。
    const paired = parseGradient('red/#cc0000;blue/#0000cc;g');
    expect(paired!.colorStops.map((stop) => [stop.light, stop.dark])).toEqual([
      ['red', '#cc0000'],
      ['blue', '#0000cc'],
    ]);
  });

  it('degrades to a plain colour when only one stop survives', () => {
    // 单色标 ⇒ 不是渐变（调用方落普通高亮）。
    expect(parseGradient('red;g')).toBeNull();
    expect(parseGradient('g')).toBeNull();
  });

  it('drops dirty stops but keeps the clean ones; all dirty ⇒ null', () => {
    const partial = parseGradient('red;;blue;g');
    expect(partial!.colorStops.map((stop) => stop.light)).toEqual(['red', 'blue']);
    expect(parseGradient('; ;g')).toBeNull();
  });

  it('does not read a plain colour (no `g` tail) as a gradient', () => {
    expect(parseGradient('purple')).toBeNull();
    expect(parseGradient(undefined)).toBeNull();
    expect(parseGradient('red;blue')).toBeNull();
  });

  it('builds a 90° CSS gradient from the stops', () => {
    const gradient = parseGradient('--one;--two;--three;g')!;
    const css = gradientCss(gradient);
    expect(css.startsWith('linear-gradient(90deg,')).toBe(true);
    expect(css).toContain('0%');
    expect(css).toContain('100%');
  });

  it('keeps the panel presets on real theme tokens and serializable values', () => {
    expect(GRADIENT_PRESETS.length).toBeGreaterThanOrEqual(2);
    for (const preset of GRADIENT_PRESETS) {
      const value = presetValue(preset.colors);
      expect(value.endsWith(';g')).toBe(true);
      expect(parseGradient(value)).not.toBeNull();
      // 两枚色标指向编辑器色板变量，而不是硬编码十六进制。
      for (const name of preset.colors) {
        expect(colorPair(name).light).toBe(`var(--editor-${name})`);
      }
    }
  });
});
