import { describe, expect, it } from 'vitest';

import { PREVIOUS_DAYS_STEP, agendaDays, revealPreviousDays } from './previous-days';

describe('revealing earlier days', () => {
  it('grows by a fixed step', () => {
    expect(revealPreviousDays(0)).toBe(PREVIOUS_DAYS_STEP);
    expect(revealPreviousDays(3)).toBe(6);
  });

  it('lists the selected day alone when nothing earlier is shown', () => {
    const days = agendaDays(new Date(2026, 9, 14), 0);
    expect(days).toHaveLength(1);
    expect(days[0].getDate()).toBe(14);
  });

  it('lists the earlier days first and ends on the selected day', () => {
    const days = agendaDays(new Date(2026, 9, 14), 3);
    expect(days.map((day) => day.getDate())).toEqual([11, 12, 13, 14]);
  });

  it('crosses a month boundary', () => {
    const days = agendaDays(new Date(2026, 9, 1), 1);
    expect(days[0].getMonth()).toBe(8);
    expect(days[0].getDate()).toBe(30);
  });
});
