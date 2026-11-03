import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { coerceInferredCell, inferColumnType, inferValueType } from './infer-type';

describe('string -> column type inference (G92)', () => {
  it('recognises the seven collected classes', () => {
    expect(inferValueType('42')).toBe('number');
    expect(inferValueType('-3.5')).toBe('number');
    expect(inferValueType('true')).toBe('checkbox');
    expect(inferValueType('FALSE')).toBe('checkbox');
    expect(inferValueType('2026-11-03')).toBe('date');
    expect(inferValueType('https://craft.do')).toBe('url');
    expect(inferValueType('www.example.com')).toBe('url');
    expect(inferValueType('me@example.com')).toBe('email');
    expect(inferValueType('+86 138 0000 0000')).toBe('phone');
    expect(inferValueType('普通文字')).toBe('text');
  });

  it('does not misread an impossible date as a phone number', () => {
    expect(inferValueType('2026-02-31')).toBe('text');
  });

  it('types a column only when every value agrees', () => {
    expect(inferColumnType(['1', '2', '3'])).toBe('number');
    expect(inferColumnType(['1', 'true'])).toBe('text');
    expect(inferColumnType(['', '  '])).toBe('text');
    expect(inferColumnType(['', '2026-11-03', '2026-11-04'])).toBe('date');
  });

  it('coerces cells to the inferred type before writing', () => {
    expect(coerceInferredCell('number', '12.5')).toEqual({ ok: true, value: 12.5 });
    expect(coerceInferredCell('checkbox', 'false')).toEqual({ ok: true, value: false });
    expect(coerceInferredCell('date', '2026-11-03')).toEqual({ ok: true, value: '2026-11-03' });
    expect(coerceInferredCell('number', '十二')).toEqual({ ok: false });
    expect(coerceInferredCell('text', '  ')).toEqual({ ok: false });
  });

  it('is wired into the CSV import', () => {
    const source = readFileSync(new URL('../../actions/collection/collection.ts', import.meta.url), 'utf8');
    expect(source).toContain('inferColumnType(rows.map((row) => row[col]');
    expect(source).toContain('type: columnTypes[col]');
    expect(source).toContain('coerceInferredCell(columnTypes[col]');
    expect(source).toContain('toTypedValue(columnTypes[col], coerced.value)');
  });
});
