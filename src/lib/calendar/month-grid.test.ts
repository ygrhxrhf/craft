import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  MONTH_GRID_DAYS,
  TODAY_KEY,
  TODAY_LABEL,
  WEEKDAY_LABELS,
  isSameDay,
  monthGrid,
  shiftMonth,
} from './month-grid';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('the month grid (G363)', () => {
  it('starts on Monday and is always six rows', () => {
    expect(WEEKDAY_LABELS[0]).toBe('一');
    // 2026-10-01 是周四 ⇒ 首格应是 09-28（周一）。
    const rows = monthGrid(new Date(2026, 9, 1));
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.length === 7)).toBe(true);
    expect(MONTH_GRID_DAYS).toBe(42);
    expect(rows[0][0].date.getDate()).toBe(28);
    expect(rows[0][0].date.getMonth()).toBe(8);
    expect(rows[0][0].outside).toBe(true);
  });

  it('marks adjacent-month cells as outside and the month itself as inside', () => {
    const rows = monthGrid(new Date(2026, 9, 15));
    const inside = rows.flat().filter((day) => !day.outside);
    expect(inside).toHaveLength(31);
    expect(inside[0].date.getDate()).toBe(1);
    expect(inside[inside.length - 1].date.getDate()).toBe(31);
  });

  it('advances a month without inheriting the day of month', () => {
    expect(shiftMonth(new Date(2026, 0, 31), 1).getMonth()).toBe(1);
    expect(shiftMonth(new Date(2026, 0, 31), 1).getDate()).toBe(1);
    expect(shiftMonth(new Date(2026, 11, 1), 1).getFullYear()).toBe(2027);
  });

  it('compares days by calendar date', () => {
    expect(isSameDay(new Date(2026, 9, 5, 9), new Date(2026, 9, 5, 23))).toBe(true);
    expect(isSameDay(new Date(2026, 9, 5), new Date(2026, 9, 6))).toBe(false);
  });

  it('takes the 今天 label from the catalog', () => {
    expect(ledgerValue(TODAY_KEY)).toBe(TODAY_LABEL);
  });
});
