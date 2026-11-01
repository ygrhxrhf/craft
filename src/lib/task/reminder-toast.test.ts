import { describe, expect, it } from 'vitest';

import { REMINDER_TOAST_DURATION_MS, nextReminderText } from './reminder-toast';

// G647: the change toast carries the new moment as its subtitle, for three seconds.
describe('the reminder-change toast', () => {
  const now = new Date(2026, 2, 10, 8, 0);

  it('stays three seconds', () => {
    expect(REMINDER_TOAST_DURATION_MS).toBe(3000);
  });

  it('labels today and tomorrow by name', () => {
    expect(nextReminderText(new Date(2026, 2, 10, 18, 0).toISOString(), now)).toBe('今天 18:00');
    expect(nextReminderText(new Date(2026, 2, 11, 9, 0).toISOString(), now)).toBe('明天 09:00');
  });

  it('uses a month/day label further out', () => {
    expect(nextReminderText(new Date(2026, 2, 20, 9, 0).toISOString(), now)).toBe('3月20日 09:00');
  });

  it('reads a missing or broken moment as no reminder', () => {
    expect(nextReminderText(null, now)).toBe('不提醒');
    expect(nextReminderText('nonsense', now)).toBe('不提醒');
  });
});
