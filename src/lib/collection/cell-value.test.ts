import { describe, expect, it } from 'vitest';

import { emptyTypedValue, isTypedValue, rawValueOf, toTypedValue } from './cell-value';

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
