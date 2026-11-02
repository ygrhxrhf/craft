import { describe, expect, it } from 'vitest';

import { draftTextFor, normalizeCellValue, normalizeTextCommit, parseNumberInput } from './cell-edit';

// G465: trimming happens at the base input, and empty collapses to null.
describe('text commit', () => {
  it('trims and turns blank input into null', () => {
    expect(normalizeTextCommit('  hello ')).toBe('hello');
    expect(normalizeTextCommit('   ')).toBeNull();
    expect(normalizeTextCommit('')).toBeNull();
    expect(normalizeTextCommit(null)).toBeNull();
  });
});

// G452: one empty shape — null — never [] or an empty items object.
describe('empty normalisation', () => {
  it('collapses every empty form to null', () => {
    expect(normalizeCellValue('')).toBeNull();
    expect(normalizeCellValue('  ')).toBeNull();
    expect(normalizeCellValue([])).toBeNull();
    expect(normalizeCellValue({ type: 'relation', items: [] })).toBeNull();
    expect(normalizeCellValue({ items: [] })).toBeNull();
  });

  it('keeps real values untouched', () => {
    expect(normalizeCellValue('x')).toBe('x');
    expect(normalizeCellValue(['a'])).toEqual(['a']);
    expect(normalizeCellValue({ items: ['a'] })).toEqual({ items: ['a'] });
    expect(normalizeCellValue(0)).toBe(0);
    expect(normalizeCellValue(false)).toBe(false);
  });
});

// G468: percent is decimal-in / percent-out, and the parser strips the display characters.
describe('number input', () => {
  it('strips thousands separators, spaces and currency marks', () => {
    expect(parseNumberInput('1,234')).toBe(1234);
    expect(parseNumberInput(' $12 ')).toBe(12);
    expect(parseNumberInput('¥12.5')).toBe(12.5);
  });

  it('accepts a percent sign and stores the decimal', () => {
    expect(parseNumberInput('12%', 'percent')).toBeCloseTo(0.12);
    expect(parseNumberInput('12', 'percent')).toBeCloseTo(0.12);
    expect(parseNumberInput('0.5%', 'percent')).toBeCloseTo(0.005);
  });

  it('returns null for blanks and non-numbers', () => {
    expect(parseNumberInput('')).toBeNull();
    expect(parseNumberInput('   ')).toBeNull();
    expect(parseNumberInput('abc')).toBeNull();
    expect(parseNumberInput(null)).toBeNull();
  });

  it('drafts a percent value as its percent number without float tails', () => {
    expect(draftTextFor(0.07, 'percent')).toBe('7');
    expect(draftTextFor(0.125, 'percent')).toBe('12.5');
    expect(draftTextFor(12.5, 'currency')).toBe('12.5');
    expect(draftTextFor(null, 'percent')).toBe('');
  });
});
