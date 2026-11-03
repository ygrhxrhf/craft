import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { nearestDay, withinRange } from './range';

describe('the range helper (G553)', () => {
  const a = new Date(2026, 9, 1);
  const b = new Date(2026, 9, 31);

  it('closes both ends by default and honours the two switches', () => {
    expect(withinRange(a, a, b)).toBe(true);
    expect(withinRange(b, a, b)).toBe(true);
    expect(withinRange(a, a, b, { includeStart: false })).toBe(false);
    expect(withinRange(b, a, b, { includeEnd: false })).toBe(false);
    expect(withinRange(new Date(2026, 8, 30), a, b)).toBe(false);
  });
});

describe('nearest-day rounding (G553)', () => {
  it('belongs to the day whose midnight is closer', () => {
    expect(nearestDay(new Date(2026, 9, 1, 9)).getDate()).toBe(1);
    expect(nearestDay(new Date(2026, 9, 1, 20)).getDate()).toBe(2);
    // 12:00 正好在中点：归次日。
    expect(nearestDay(new Date(2026, 9, 1, 12)).getDate()).toBe(2);
  });
});

describe('the helpers are wired where the ledger says (G553)', () => {
  const read = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

  it('serves the calendar spans and the daily-note day rounding', () => {
    expect(read('lib/calendar/timeline.ts')).toContain('withinRange(startOfDay(day), start, end)');
    expect(read('lib/calendar/week-view.ts')).toContain('withinRange(new Date(day.getFullYear()');
    expect(read('actions/daily-notes/daily-notes.ts')).toContain('nearestDay(step)');
  });
});
