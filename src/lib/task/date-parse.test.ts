import { describe, expect, it } from 'vitest';

import {
  adoptDateExpression,
  isPastLocalDay,
  isSameLocalDay,
  parseDateExpression,
  startOfLocalDay,
} from './date-parse';

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h, 30, 0, 0);
// 2026-03-10 is a Tuesday.
const now = at(2026, 3, 10);

function expectDay(input: string, expected: [number, number, number]) {
  const result = parseDateExpression(input, now);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect([result.date.getFullYear(), result.date.getMonth() + 1, result.date.getDate()]).toEqual(expected);
}

describe('strict calendar formats (tier 1)', () => {
  it('accepts dash, dot and slash separators', () => {
    expectDay('2026-03-20', [2026, 3, 20]);
    expectDay('2026.03.20', [2026, 3, 20]);
    expectDay('2026/3/20', [2026, 3, 20]);
  });

  it('rejects a date that does not exist instead of rolling it over', () => {
    expect(parseDateExpression('2026-02-30', now)).toEqual({ ok: false, reason: 'unparsed' });
  });
});

describe('relative phrases (tier 2)', () => {
  it('handles today and the next two days', () => {
    expectDay('今天', [2026, 3, 10]);
    expectDay('明天', [2026, 3, 11]);
    expectDay('后天', [2026, 3, 12]);
  });

  it('handles the next N days', () => {
    expectDay('3天后', [2026, 3, 13]);
  });

  it('resolves 下周X against a Monday-based week', () => {
    expectDay('下周五', [2026, 3, 20]);
    expectDay('下周一', [2026, 3, 16]);
  });

  it('resolves 本周X inside the current week', () => {
    expectDay('本周三', [2026, 3, 11]);
    expectDay('这周五', [2026, 3, 13]);
  });

  it('takes a bare weekday as the next occurrence, never today', () => {
    expectDay('周五', [2026, 3, 13]);
    // On a Friday the next 「周五」 is a week later.
    const friday = at(2026, 3, 13);
    const result = parseDateExpression('周五', friday);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect([result.date.getMonth() + 1, result.date.getDate()]).toEqual([3, 20]);
    }
  });

  it('resolves a month and day inside the current year', () => {
    expectDay('10月9日', [2026, 10, 9]);
    expectDay('10月9号', [2026, 10, 9]);
  });

  it('leaves unknown text (and 上周五) unparsed', () => {
    expect(parseDateExpression('上周五', now)).toEqual({ ok: false, reason: 'unparsed' });
    expect(parseDateExpression('随便', now)).toEqual({ ok: false, reason: 'unparsed' });
    expect(parseDateExpression('  ', now)).toEqual({ ok: false, reason: 'empty' });
  });
});

describe('normalization and the past check', () => {
  it('returns local midnight', () => {
    const result = parseDateExpression('2026-03-20', now);
    expect(result.ok && result.date.getHours()).toBe(0);
    expect(result.ok && isSameLocalDay(result.date, at(2026, 3, 20, 23))).toBe(true);
  });

  it('treats yesterday as past and today as not', () => {
    expect(isPastLocalDay(at(2026, 3, 9), now)).toBe(true);
    expect(isPastLocalDay(at(2026, 3, 10, 0), now)).toBe(false);
    expect(startOfLocalDay(at(2026, 3, 10, 23)).getDate()).toBe(10);
  });
});

// G333: only today-or-later is adopted; an unchanged day is not written again.
describe('the write guard', () => {
  it('clears an empty box', () => {
    expect(adoptDateExpression('', '2026-03-20T00:00:00.000Z', now)).toEqual({
      action: 'clear',
      value: null,
    });
  });

  it('ignores unparsed and past input without an error', () => {
    expect(adoptDateExpression('上周五', null, now).action).toBe('ignore');
    expect(adoptDateExpression('2026-01-05', null, now).action).toBe('ignore');
  });

  it('commits a future day at local midnight', () => {
    const result = adoptDateExpression('下周五', null, now);
    expect(result.action).toBe('commit');
    if (result.action !== 'commit') return;
    expect(result.value).toBe(startOfLocalDay(at(2026, 3, 20)).toISOString());
  });

  it('skips a write when the day did not change', () => {
    const current = startOfLocalDay(at(2026, 3, 20)).toISOString();
    expect(adoptDateExpression('2026-03-20', current, now)).toEqual({
      action: 'skip',
      value: current,
    });
  });
});
