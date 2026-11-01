import { describe, expect, it } from 'vitest';

import {
  OFFICIAL_COLUMN_TYPES,
  PROPERTY_TYPES,
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
