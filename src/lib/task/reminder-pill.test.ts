import { describe, expect, it } from 'vitest';

import {
  REMINDER_ACTIONS,
  pillClock,
  reminderPillLabel,
} from './reminder-pill';

/**
 * The reminder pill (G1468): the label format, and the three management actions with their short
 * command keys.
 */
describe('the pill label', () => {
  const now = new Date(2026, 9, 14, 9, 0, 0);

  it('prints 今天 with a comma and a space before the clock', () => {
    const at = new Date(2026, 9, 14, 18, 12, 0);
    expect(reminderPillLabel(at, now)).toBe('今天, 18:12');
  });

  it('prints 明天 for the next day', () => {
    const at = new Date(2026, 9, 15, 8, 5, 0);
    expect(reminderPillLabel(at, now)).toBe('明天, 08:05');
  });

  it('prints a date for anything further out', () => {
    const at = new Date(2026, 9, 20, 14, 30, 0);
    expect(reminderPillLabel(at, now)).toBe('10月20日, 14:30');
  });

  it('zero-pads the clock', () => {
    expect(pillClock(new Date(2026, 9, 14, 7, 4, 0))).toBe('07:04');
    expect(pillClock(new Date(2026, 9, 14, 23, 59, 0))).toBe('23:59');
  });
});

describe('the management actions', () => {
  it('has the three, in order', () => {
    expect(REMINDER_ACTIONS.map((a) => a.label)).toEqual(['标记为已解决', '改期', '移除提醒']);
  });

  it('uses the short command keys, not the reminder-family synonyms', () => {
    expect(REMINDER_ACTIONS[0].key).toBe('commands.mark.as.resolved');
    expect(REMINDER_ACTIONS[0].key).not.toBe('commands.reminder.mark.resolved');
    expect(REMINDER_ACTIONS[1].key).toBe('commands.reschedule');
    expect(REMINDER_ACTIONS[2].key).toBe('commands.remove.reminder');
  });
});
