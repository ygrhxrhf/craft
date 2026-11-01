import { describe, expect, it } from 'vitest';

import { convertCellValue } from './type-convert';
import { isValidDateValue, normalizeDateValue } from './date-value';

// G299：能转就转，转不了才清空（官方「如果可以转换，修改字段类型将会转换当前值。」）
describe('converting a cell value to another field type', () => {
  it('turns numbers and arrays into text', () => {
    expect(convertCellValue(42, 'text')).toBe('42');
    expect(convertCellValue(['a', 'b'], 'text')).toBe('a、b');
  });

  it('parses numeric text and rejects the rest', () => {
    expect(convertCellValue('12.5', 'number')).toBe(12.5);
    expect(convertCellValue('abc', 'number')).toBeNull();
  });

  it('maps the boolean spellings a checkbox can read', () => {
    expect(convertCellValue('true', 'checkbox')).toBe(true);
    expect(convertCellValue('false', 'checkbox')).toBe(false);
    expect(convertCellValue(0, 'checkbox')).toBe(false);
    expect(convertCellValue('yes', 'checkbox')).toBeNull();
  });

  it('normalizes a date to ISO and rejects junk', () => {
    expect(convertCellValue('2026-03-10T09:00:00.000Z', 'date')).toBe('2026-03-10T09:00:00.000Z');
    expect(convertCellValue('not a date', 'date')).toBeNull();
  });

  it('keeps the first entry when collapsing a multi-select into a select', () => {
    expect(convertCellValue(['red', 'blue'], 'select')).toBe('red');
    expect(convertCellValue('red', 'multi_select')).toEqual(['red']);
  });

  it('clears values a target type cannot represent', () => {
    expect(convertCellValue({ name: 'x' }, 'relation')).toBeNull();
    expect(convertCellValue('x', 'file')).toBeNull();
    expect(convertCellValue('x', 'formula')).toBeNull();
  });

  it('treats empty input as null for every target', () => {
    for (const target of ['text', 'number', 'checkbox', 'date', 'select', 'multi_select']) {
      expect(convertCellValue('', target)).toBeNull();
      expect(convertCellValue(null, target)).toBeNull();
    }
  });
});

// G394: the date column refuses values that are not dates instead of storing broken strings.
describe('date value validation', () => {
  it('accepts a Date and an ISO string', () => {
    expect(normalizeDateValue(new Date('2026-03-10T00:00:00.000Z'))).toBe('2026-03-10T00:00:00.000Z');
    expect(normalizeDateValue('2026-03-10T00:00:00.000Z')).toBe('2026-03-10T00:00:00.000Z');
  });

  it('refuses a value that is not a date', () => {
    expect(normalizeDateValue('下周')).toBeNull();
    expect(normalizeDateValue(42)).toBeNull();
    expect(normalizeDateValue(new Date('nope'))).toBeNull();
    expect(isValidDateValue('nope')).toBe(false);
    expect(isValidDateValue(null)).toBe(false);
  });
});
