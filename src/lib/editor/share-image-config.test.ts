import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SHARE_IMAGE_FONT,
  DEFAULT_SHARE_IMAGE_SIZE,
  SHARE_IMAGE_FONT_OPTIONS,
  SHARE_IMAGE_FONT_SCALE,
  SHARE_IMAGE_FONT_SECTION,
  SHARE_IMAGE_SIZE_OPTIONS,
  SHARE_IMAGE_SIZE_SECTION,
  shareImageCanvas,
} from './share-image-config';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('share card image config (G64)', () => {
  it('takes both section titles from the catalog', () => {
    expect(ledgerValue(SHARE_IMAGE_FONT_SECTION.key)).toBe(SHARE_IMAGE_FONT_SECTION.label);
    expect(ledgerValue(SHARE_IMAGE_SIZE_SECTION.key)).toBe(SHARE_IMAGE_SIZE_SECTION.label);
  });

  it('takes every font and page label from the catalog', () => {
    for (const option of [...SHARE_IMAGE_FONT_OPTIONS, ...SHARE_IMAGE_SIZE_OPTIONS]) {
      expect(ledgerValue(option.key), option.key).toBe(option.label);
    }
  });

  it('offers the three fonts and four pages in the official order', () => {
    expect(SHARE_IMAGE_FONT_OPTIONS.map((o) => o.id)).toEqual(['big', 'regular', 'small']);
    expect(SHARE_IMAGE_SIZE_OPTIONS.map((o) => o.id)).toEqual(['fit', 'landscape', 'portrait', 'square']);
    expect(DEFAULT_SHARE_IMAGE_FONT).toBe('regular');
    expect(DEFAULT_SHARE_IMAGE_SIZE).toBe('fit');
  });

  it('scales the root font and pads fixed page sizes without cropping', () => {
    expect(SHARE_IMAGE_FONT_SCALE.big).toBeGreaterThan(1);
    expect(SHARE_IMAGE_FONT_SCALE.small).toBeLessThan(1);

    expect(shareImageCanvas('fit', 800, 1200)).toEqual({ width: 800, height: 1200 });
    expect(shareImageCanvas('landscape', 800, 300)).toEqual({ width: 800, height: 450 });
    expect(shareImageCanvas('portrait', 800, 300)).toEqual({ width: 800, height: 1067 });
    expect(shareImageCanvas('square', 800, 300)).toEqual({ width: 800, height: 800 });
    // Tall content grows the canvas rather than being clipped.
    expect(shareImageCanvas('square', 800, 1400)).toEqual({ width: 800, height: 1400 });
  });
});
