import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { separatorStyleOf } from '@/components/editor/themes/page-style';
import {
  DOODLE_SEPARATOR_CSS,
  WASHI_TAPE_PRESETS,
  normalizeSeparatorStyle,
  washiTapeSrc,
} from './washi-catalog';

describe('和纸胶带图库（G210）', () => {
  it('holds the 96 official presets, in official order', () => {
    expect(WASHI_TAPE_PRESETS).toHaveLength(96);
    expect(WASHI_TAPE_PRESETS[0]).toEqual({ key: 'childhood', label: 'Childhood' });
    expect(WASHI_TAPE_PRESETS.some((preset) => preset.key === 'mint-pixels')).toBe(true);
    // key 唯一。
    expect(new Set(WASHI_TAPE_PRESETS.map((preset) => preset.key)).size).toBe(96);
  });

  it('ships every tape image in public/washi', () => {
    const missing = WASHI_TAPE_PRESETS.filter((preset) => !existsSync(join(process.cwd(), 'public', 'washi', `${preset.key}.jpg`)));
    expect(missing.map((preset) => preset.key)).toEqual([]);
  });

  it('resolves a tape image only for known keys', () => {
    expect(washiTapeSrc('childhood')).toBe('/washi/childhood.jpg');
    expect(washiTapeSrc('nope')).toBeNull();
    expect(washiTapeSrc(null)).toBeNull();
  });

  it('normalises the three separator styles and rejects anything else', () => {
    expect(normalizeSeparatorStyle('line')).toBe('line');
    expect(normalizeSeparatorStyle('washi')).toBe('washi');
    expect(normalizeSeparatorStyle('doodle')).toBe('doodle');
    expect(normalizeSeparatorStyle('tape')).toBeUndefined();
    expect(normalizeSeparatorStyle(42)).toBeUndefined();
  });

  it('keeps old documents readable through the washi fallback', () => {
    expect(separatorStyleOf({})).toBe('line');
    expect(separatorStyleOf({ washi: 'sunset' })).toBe('washi');
    expect(separatorStyleOf({ washi: 'none' })).toBe('line');
    expect(separatorStyleOf({ separatorStyle: 'doodle', washi: 'sunset' })).toBe('doodle');
    expect(separatorStyleOf(null)).toBe('line');
  });

  it('draws the doodle separator as a tiled hand-drawn svg', () => {
    expect(DOODLE_SEPARATOR_CSS).toContain('data:image/svg+xml');
    expect(DOODLE_SEPARATOR_CSS).toContain('repeat-x');
  });
});