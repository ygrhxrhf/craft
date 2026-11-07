import { describe, expect, it } from 'vitest';

import { REPEAT_REMINDER_OFFSET_MINUTES, defaultReminderForRepeat, rollForwardReminder } from './repeat-reminder';

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

// G644 —— 提醒是一条「排期日 ＋ 当日分钟数」的表达式：滚到下一期时**日期换新、时刻不动**。
describe('roll-forward reminder expression (G644)', () => {
  const before = new Date('2026-09-28T08:00:00.000Z');

  it('keeps the minute-of-day and takes the day from the new schedule', () => {
    // The old writer kept the lead (`00:00 − 09:00 = −9 h`), so a completion-anchored roll that
    // landed at 14:30 put the reminder at 23:30. The expression pins the clock instead.
    const remindAt = rollForwardReminder('2026-09-28T09:00:00.000Z', new Date('2026-09-29T14:30:00.000Z'), 'UTC', before);
    expect(remindAt).toBe('2026-09-29T09:00:00.000Z');
  });

  it('reads the day in the task zone, not in UTC', () => {
    // 2026-09-29T16:00Z is already the 30th in Shanghai; the 09:00 Shanghai clock follows it.
    const remindAt = rollForwardReminder('2026-09-28T01:00:00.000Z', new Date('2026-09-29T16:00:00.000Z'), 'Asia/Shanghai', before);
    expect(remindAt).toBe('2026-09-30T01:00:00.000Z');
  });

  it('silently drops a reminder that would already be in the past', () => {
    expect(rollForwardReminder('2026-09-28T09:00:00.000Z', new Date('2026-09-28T00:00:00.000Z'), 'UTC', new Date('2026-09-28T10:00:00.000Z'))).toBeNull();
  });

  it('is idempotent when the computed instant is the one already stored', () => {
    const stored = '2026-09-28T09:00:00.000Z';
    expect(rollForwardReminder(stored, new Date('2026-09-28T18:00:00.000Z'), 'UTC', before)).toBe(stored);
  });

  it('has nothing to roll without a reminder, and tolerates bad values', () => {
    expect(rollForwardReminder(null, new Date('2026-09-29T00:00:00.000Z'), 'UTC', before)).toBeNull();
    expect(rollForwardReminder('', new Date('2026-09-29T00:00:00.000Z'), 'UTC', before)).toBeNull();
    expect(rollForwardReminder('nonsense', new Date('2026-09-29T00:00:00.000Z'), 'UTC', before)).toBeNull();
  });
});
