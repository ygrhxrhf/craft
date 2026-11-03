import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { coerceTextForType, parseCheckboxText, parseDateText } from './coerce';

describe('the cell text coercion (G92)', () => {
  it('takes only the true/false whitelist for checkboxes', () => {
    expect(parseCheckboxText('true')).toBe(true);
    expect(parseCheckboxText(' FALSE ')).toBe(false);
    expect(parseCheckboxText('yes')).toBeNull();
    expect(parseCheckboxText('1')).toBeNull();
    expect(coerceTextForType('checkbox', 'yes')).toEqual({ ok: false });
  });

  it('keeps a real calendar day and drops an impossible one', () => {
    expect(parseDateText('2026-10-09')).toBe('2026-10-09');
    expect(parseDateText('2026-02-31')).toBeNull();
    expect(parseDateText('not a date')).toBeNull();
    expect(coerceTextForType('date', '2026-02-31')).toEqual({ ok: false });
  });

  it('accepts a full ISO instant for datetime columns', () => {
    expect(parseDateText('2026-10-09T08:30:00.000Z')).toBe('2026-10-09T08:30:00.000Z');
    expect(coerceTextForType('datetime', 'garbage')).toEqual({ ok: false });
  });

  it('passes every other type through untouched', () => {
    expect(coerceTextForType('text', 'hello')).toEqual({ ok: true, value: 'hello' });
    expect(coerceTextForType('number', '12')).toEqual({ ok: true, value: '12' });
  });

  it('runs before the write for the three affected column types', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'actions', 'collection', 'items.ts'),
      'utf8',
    );
    expect(source).toContain("coerceTextForType(propType, normalizedValue)");
    expect(source).toContain("propType === 'checkbox'");
    expect(source).toContain('coerced.ok ? coerced.value : null');
  });
});
