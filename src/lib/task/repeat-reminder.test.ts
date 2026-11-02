import { describe, expect, it } from 'vitest';

import { REPEAT_REMINDER_OFFSET_MINUTES, defaultReminderForRepeat } from './repeat-reminder';

// G667: a new repeat auto-attaches a reminder at 09:00 on its schedule day (offset 540 minutes).
describe('repeat default reminder (G667)', () => {
  const schedule = new Date(2026, 10, 2, 15, 30).toISOString();

  it('uses the official 540-minute offset', () => {
    expect(REPEAT_REMINDER_OFFSET_MINUTES).toBe(540);
  });

  it('fills 09:00 on the schedule day', () => {
    const at = new Date(defaultReminderForRepeat(schedule, null)!);
    expect([at.getHours(), at.getMinutes()]).toEqual([9, 0]);
    expect([at.getFullYear(), at.getMonth(), at.getDate()]).toEqual([2026, 10, 2]);
  });

  it('keeps an existing reminder and needs a schedule day', () => {
    const existing = '2026-11-03T01:00:00.000Z';
    expect(defaultReminderForRepeat(schedule, existing)).toBe(existing);
    expect(defaultReminderForRepeat(null, null)).toBeNull();
  });
});
