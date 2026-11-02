import { describe, expect, it } from 'vitest';
import { validateMultiSelect, validateSelect } from './value-validation';

const OPTS = ['a', 'b', 'c'];

describe('validateSelect (G395)', () => {
  it('accepts a value inside the option set', () => {
    expect(validateSelect({ optionIds: OPTS, value: 'b' })).toEqual({ ok: true, value: 'b' });
  });

  it('treats null / empty string as a clear', () => {
    expect(validateSelect({ optionIds: OPTS, value: null })).toEqual({ ok: true, value: '' });
    expect(validateSelect({ optionIds: OPTS, value: '' })).toEqual({ ok: true, value: '' });
  });

  it('refuses a value outside the set instead of filtering it', () => {
    expect(validateSelect({ optionIds: OPTS, value: 'z' })).toEqual({ ok: false, reason: 'unknown-option' });
  });

  it('refuses a non-string', () => {
    expect(validateSelect({ optionIds: OPTS, value: 3 })).toEqual({ ok: false, reason: 'not-a-string' });
  });
});

describe('validateMultiSelect (G395: one bad element fails the whole cell)', () => {
  it('accepts an array where every element is a known option', () => {
    expect(validateMultiSelect({ optionIds: OPTS, value: ['a', 'c'] })).toEqual({ ok: true, value: ['a', 'c'] });
  });

  it('accepts an empty array as a clear', () => {
    expect(validateMultiSelect({ optionIds: OPTS, value: [] })).toEqual({ ok: true, value: [] });
    expect(validateMultiSelect({ optionIds: OPTS, value: null })).toEqual({ ok: true, value: [] });
  });

  it('fails the whole cell on a single unknown option (does not filter it out)', () => {
    expect(validateMultiSelect({ optionIds: OPTS, value: ['a', 'zzz'] })).toEqual({
      ok: false,
      reason: 'unknown-option',
    });
  });

  it('fails the whole cell on a non-string element', () => {
    expect(validateMultiSelect({ optionIds: OPTS, value: ['a', 2] })).toEqual({ ok: false, reason: 'not-a-string' });
  });

  it('refuses a non-array', () => {
    expect(validateMultiSelect({ optionIds: OPTS, value: 'a' })).toEqual({ ok: false, reason: 'not-an-array' });
  });

  it('an empty option set rejects any non-empty selection', () => {
    expect(validateMultiSelect({ optionIds: [], value: ['a'] })).toEqual({ ok: false, reason: 'unknown-option' });
  });
});
