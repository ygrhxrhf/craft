import { describe, expect, it } from 'vitest';

import {
  DECORATION_FAMILY_KEYS,
  DECORATION_MATERIALS,
  SEPARATOR_MATERIALS,
  decorationMaterial,
  isGallery,
} from './decorations';

/**
 * Page decorations (G157). Nine materials, two families, and the three the separator panel
 * offers.
 */
describe('the material vocabulary', () => {
  it('names the nine materials verbatim', () => {
    expect(DECORATION_MATERIALS.map((m) => m.id)).toEqual([
      'washi',
      'washi.tape',
      'washi.gallery',
      'doodle',
      'pattern',
      'radial',
      'paper',
      'backdrop',
      'card.style',
    ]);
  });

  it('labels the three the separator panel shows', () => {
    expect(decorationMaterial('washi')?.label).toBe('和纸');
    expect(decorationMaterial('washi.tape')?.label).toBe('和纸胶带');
    expect(decorationMaterial('doodle')?.label).toBe('涂鸦');
  });

  it('marks the washi gallery as browsable', () => {
    expect(isGallery('washi.gallery')).toBe(true);
    expect(isGallery('washi.tape')).toBe(false);
  });

  it('returns null for a material outside the vocabulary', () => {
    expect(decorationMaterial('confetti')).toBeNull();
  });
});

describe('the two families', () => {
  it('carries the collected keys', () => {
    expect(DECORATION_FAMILY_KEYS.block).toBe('decoration.block');
    expect(DECORATION_FAMILY_KEYS.focus).toBe('decoration.focus');
  });
});

describe('the separator materials', () => {
  it('offers line, washi tape and doodle', () => {
    expect([...SEPARATOR_MATERIALS]).toEqual(['washi', 'washi.tape', 'doodle']);
  });

  it('names only materials that exist', () => {
    for (const id of SEPARATOR_MATERIALS) {
      expect(decorationMaterial(id), id).not.toBeNull();
    }
  });
});
