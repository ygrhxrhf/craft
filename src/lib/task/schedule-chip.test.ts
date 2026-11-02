import { describe, expect, it } from 'vitest';

import { scheduleChipLabel } from './schedule-chip';

// G371: calendar icon + Chinese short date (month/day, no year); unset stays icon-only.
describe('schedule chip (G371)', () => {
  it('prints the month and day without a year', () => {
    const label = scheduleChipLabel('2026-10-09T00:00:00.000Z');
    expect(label).toBeTruthy();
    expect(label).toContain('10');
    expect(label).toContain('9');
    expect(label).not.toContain('2026');
  });

  it('returns null for empty or invalid values', () => {
    expect(scheduleChipLabel(null)).toBeNull();
    expect(scheduleChipLabel(undefined)).toBeNull();
    expect(scheduleChipLabel('not-a-date')).toBeNull();
  });
});
