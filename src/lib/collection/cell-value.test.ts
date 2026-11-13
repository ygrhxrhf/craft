import { describe, expect, it } from 'vitest';

import { emptyTypedValue, isTypedValue, parseCellValue, rawValueOf, toTypedValue } from './cell-value';

/**
 * G451: a cell value is a typed discriminant `{type, theme, value}`, so a `null` still says which
 * type of empty it is — something a bare `Json?` column cannot.
 */
describe('the typed cell value (G451)', () => {
  it('wraps a bare value with its type', () => {
    expect(toTypedValue('number', 3)).toEqual({ type: 'number', theme: null, value: 3 });
  });

  it('keeps a typed value\u2019s own type and normalises its theme', () => {
    expect(toTypedValue('number', { type: 'text', theme: 'blue', value: 'x' })).toEqual({
      type: 'text',
      theme: 'blue',
      value: 'x',
    });
  });

  it('drops a theme that is not in the palette', () => {
    expect(toTypedValue('text', { type: 'text', theme: 'chartreuse', value: 'x' }).theme).toBeNull();
  });

  it('keeps the type on an empty value, so two empties are distinguishable', () => {
    expect(emptyTypedValue('date')).toEqual({ type: 'date', theme: null, value: null });
    expect(emptyTypedValue('text')).toEqual({ type: 'text', theme: null, value: null });
  });

  it('round-trips back to the raw value', () => {
    expect(rawValueOf({ type: 'number', theme: null, value: 7 })).toBe(7);
  });

  it('passes a legacy bare value through unchanged', () => {
    expect(rawValueOf(7)).toBe(7);
    expect(rawValueOf(null)).toBeNull();
    expect(isTypedValue(7)).toBe(false);
    expect(isTypedValue({ type: 'number', value: 1 })).toBe(true);
  });
});

/**
 * The read side sees one column in three shapes: an already-decoded discriminant, the same
 * discriminant still as a JSON string, and a pre-G451 bare value. All three must land on the bare
 * value, otherwise `String(cell)` renders `[object Object]` and filters compare objects.
 */
describe('reading a cell back (G451)', () => {
  it('unwraps a decoded discriminant', () => {
    expect(parseCellValue({ type: 'number', theme: null, value: 7 })).toBe(7);
    expect(parseCellValue({ type: 'text', theme: null, value: null })).toBeNull();
  });

  it('unwraps a discriminant that arrives as a JSON string', () => {
    expect(parseCellValue(JSON.stringify({ type: 'number', theme: null, value: 7 }))).toBe(7);
    expect(parseCellValue(JSON.stringify({ type: 'multi_select', theme: null, value: ['红', '蓝'] }))).toEqual([
      '红',
      '蓝',
    ]);
  });

  it('passes a legacy bare value through', () => {
    expect(parseCellValue('甲')).toBe('甲');
    expect(parseCellValue(7)).toBe(7);
    expect(parseCellValue(true)).toBe(true);
  });

  it('collapses null and the empty string to null', () => {
    expect(parseCellValue(null)).toBeNull();
    expect(parseCellValue(undefined)).toBeNull();
    expect(parseCellValue('')).toBeNull();
  });

  it('parses a JSON string that is not a discriminant, and keeps invalid JSON raw', () => {
    // 与 G451 之前的读侧同口径：字符串里的 JSON 要解出来（旧写入可能是 JSON 字符串化的数组）。
    expect(parseCellValue('[1,2]')).toEqual([1, 2]);
    expect(parseCellValue('{oops')).toBe('{oops');
  });
});
