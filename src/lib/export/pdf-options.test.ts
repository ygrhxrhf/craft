import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PDF_EXPORT_OPTIONS,
  PDF_PAPER_OPTIONS,
  PDF_PAPER_SIZES,
  PDF_TOGGLE_OPTIONS,
  normalizePdfOptions,
} from './pdf-options';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('PDF export options (G149)', () => {
  it('takes every label from the catalog', () => {
    for (const option of [...PDF_PAPER_OPTIONS, ...PDF_TOGGLE_OPTIONS]) {
      expect(ledgerValue(option.key), option.key).toBe(option.label);
    }
  });

  it('offers A4, 信纸 and 动态 in that order', () => {
    expect(PDF_PAPER_OPTIONS.map((option) => option.id)).toEqual(['a4', 'usletter', 'dynamic']);
    expect(PDF_PAPER_SIZES.a4).toEqual({ width: 595, height: 842 });
    expect(PDF_PAPER_SIZES.usletter).toEqual({ width: 612, height: 792 });
  });

  it('defaults to A4 with all three toggles off', () => {
    expect(DEFAULT_PDF_EXPORT_OPTIONS).toEqual({
      paper: 'a4',
      dark: false,
      pageNumbers: false,
      watermark: false,
    });
  });

  it('folds an unknown payload onto the defaults', () => {
    expect(normalizePdfOptions(null)).toEqual(DEFAULT_PDF_EXPORT_OPTIONS);
    expect(normalizePdfOptions({ paper: 'a3', dark: 'yes' })).toEqual(DEFAULT_PDF_EXPORT_OPTIONS);
    expect(normalizePdfOptions({ paper: 'dynamic', watermark: true })).toEqual({
      paper: 'dynamic',
      dark: false,
      pageNumbers: false,
      watermark: true,
    });
  });
});
