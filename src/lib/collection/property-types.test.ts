import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NUMBER_FORMAT,
  FIELD_TYPE_ICONS,
  NUMBER_FORMATS,
  OFFICIAL_COLUMN_TYPES,
  PROPERTY_TYPES,
  UNKNOWN_FIELD_ICON,
  fieldIconFor,
  formatNumber,
  isNumberFormat,
  localColumnType,
  officialColumnType,
} from './property-types';

// G393: thirteen official values, with two renamed pairs and three local-only extras.
describe('the column type vocabulary', () => {
  it('lists the thirteen official values', () => {
    expect([...OFFICIAL_COLUMN_TYPES]).toEqual([
      'text', 'number', 'checkbox', 'date', 'url', 'person', 'select', 'multiSelect',
      'media', 'relation', 'linkToBlock', 'email', 'phone',
    ]);
  });

  it('maps the two renamed pairs both ways', () => {
    expect(officialColumnType('multi_select')).toBe('multiSelect');
    expect(officialColumnType('file')).toBe('media');
    expect(localColumnType('multiSelect')).toBe('multi_select');
    expect(localColumnType('media')).toBe('file');
  });

  it('passes through the names that are identical', () => {
    expect(officialColumnType('text')).toBe('text');
    expect(officialColumnType('linkToBlock')).toBe('linkToBlock');
    expect(localColumnType('linkToBlock')).toBe('linkToBlock');
  });

  it('rejects a local-only or unknown type', () => {
    expect(officialColumnType('formula')).toBeNull();
    expect(officialColumnType('nonsense')).toBeNull();
    expect(localColumnType('nonsense')).toBeNull();
  });

  it('offers all thirteen official types plus the local-only ones', () => {
    const values = PROPERTY_TYPES.map((type) => type.value);
    for (const official of OFFICIAL_COLUMN_TYPES) {
      expect(values).toContain(official);
    }
    expect(values).toContain('formula');
    expect(values).toContain('media');
    expect(values).toContain('linkToBlock');
    expect(values).toContain('multiSelect');
  });
});

// G396: three display sub-formats for numbers, and an icon for every field type.
describe('number sub-formats and field icons', () => {
  it('lists the three formats in official order', () => {
    expect(NUMBER_FORMATS.map((format) => format.value)).toEqual(['number', 'percent', 'currency']);
    expect(NUMBER_FORMATS.map((format) => format.icon)).toEqual(['hashtag', 'percentage', 'money']);
    expect(DEFAULT_NUMBER_FORMAT).toBe('number');
  });

  it('recognises exactly the three format names', () => {
    expect(isNumberFormat('number')).toBe(true);
    expect(isNumberFormat('percent')).toBe(true);
    expect(isNumberFormat('currency')).toBe(true);
    expect(isNumberFormat('money')).toBe(false);
    expect(isNumberFormat(null)).toBe(false);
  });

  it('renders a percent as value × 100 with a percent sign', () => {
    expect(formatNumber(0.5, 'percent')).toBe('50%');
    expect(formatNumber(1, 'percent')).toBe('100%');
  });

  it('renders currency with the product currency symbol', () => {
    expect(formatNumber(12.5, 'currency')).toBe('¥12.5');
  });

  it('leaves plain numbers plain and never prints NaN', () => {
    expect(formatNumber(1234.5)).toBe('1,234.5');
    expect(formatNumber('abc')).toBe('');
    expect(formatNumber(null)).toBe('');
  });

  it('gives every product type an icon and falls back for unknown ones', () => {
    for (const type of [...PROPERTY_TYPES.map((item) => item.value), 'created_at', 'updated_at']) {
      expect(fieldIconFor(type)).not.toBe(UNKNOWN_FIELD_ICON);
      expect(FIELD_TYPE_ICONS[type]).toBeTruthy();
    }
    expect(fieldIconFor('email')).toBe('envelope');
    expect(fieldIconFor('phone')).toBe('phone');
    expect(fieldIconFor('person')).toBe('at-sign');
    expect(fieldIconFor('nonsense')).toBe(UNKNOWN_FIELD_ICON);
    expect(fieldIconFor(undefined)).toBe(UNKNOWN_FIELD_ICON);
  });
});
