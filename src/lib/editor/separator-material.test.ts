import { describe, expect, it } from 'vitest';

import { WASHI_PATTERNS } from './washi-patterns';
import {
  DEFAULT_SEPARATOR_ATTRS,
  DEFAULT_WASHI_PATTERN,
  SEPARATOR_MATERIAL_IDS,
  WASHI_PATTERN_CHOICES,
  isWashiSeparator,
  normalizeSeparatorMaterial,
  normalizeWashiColor,
  normalizeWashiPattern,
  washiPatternDescription,
} from './separator-material';

/**
 * G1247: the divider carries a material axis on top of its weight — `--separator washi` plus a
 * pattern (six built-ins) and a hex colour. The six descriptions are the ones the official listing
 * prints.
 */
describe('the separator material axis', () => {
  it('has exactly the two materials', () => {
    expect([...SEPARATOR_MATERIAL_IDS]).toEqual(['line', 'washi']);
  });

  it('reads anything that is not washi as a plain line', () => {
    expect(normalizeSeparatorMaterial('washi')).toBe('washi');
    expect(normalizeSeparatorMaterial('line')).toBe('line');
    expect(normalizeSeparatorMaterial(undefined)).toBe('line');
    expect(normalizeSeparatorMaterial('和纸')).toBe('line');
  });

  it('treats a pattern only as tape when the material says so', () => {
    expect(isWashiSeparator({ separator: 'washi' })).toBe(true);
    expect(isWashiSeparator({ separator: 'line' })).toBe(false);
    // 旧文档没有这枚属性 ⇒ 仍是普通分隔线，渲染一字不变。
    expect(isWashiSeparator({})).toBe(false);
  });
});

describe('the six washi patterns', () => {
  it('matches the collected vocabulary, in order', () => {
    expect(WASHI_PATTERN_CHOICES.map((c) => c.name)).toEqual([
      'hex', 'dot', 'stripe', 'diagonal', 'grid', 'wave',
    ]);
    expect(WASHI_PATTERN_CHOICES.map((c) => c.name)).toEqual(WASHI_PATTERNS.map((p) => p.name));
  });

  it('keeps the official descriptions verbatim', () => {
    expect(washiPatternDescription('hex')).toBe('Hexagon geometric pattern');
    expect(washiPatternDescription('dot')).toBe('Dot pattern');
    expect(washiPatternDescription('stripe')).toBe('Horizontal stripe pattern');
    expect(washiPatternDescription('diagonal')).toBe('Diagonal stripe pattern');
    expect(washiPatternDescription('grid')).toBe('Grid pattern');
    expect(washiPatternDescription('wave')).toBe('Wave pattern');
    expect(washiPatternDescription('nope')).toBeNull();
  });

  it('an unknown name lands on the default rather than riding through', () => {
    expect(normalizeWashiPattern('hex')).toBe('hex');
    expect(normalizeWashiPattern('nope')).toBe(DEFAULT_WASHI_PATTERN);
    expect(normalizeWashiPattern(undefined)).toBe(DEFAULT_WASHI_PATTERN);
  });
});

describe('the washi colour', () => {
  it('accepts a six-digit hex literal and upper-cases it', () => {
    expect(normalizeWashiColor('#3b82f6')).toBe('#3B82F6');
    expect(normalizeWashiColor('  #ff0000  ')).toBe('#FF0000');
  });

  it('falls back to the official sample for anything unusable', () => {
    // 官方只声明"颜色走十六进制字面量"，示例值是 #3B82F6；不是某档的官方色值。
    expect(normalizeWashiColor('#f00')).toBe(DEFAULT_SEPARATOR_ATTRS.color);
    expect(normalizeWashiColor('red')).toBe(DEFAULT_SEPARATOR_ATTRS.color);
    expect(normalizeWashiColor(null)).toBe(DEFAULT_SEPARATOR_ATTRS.color);
  });
});
