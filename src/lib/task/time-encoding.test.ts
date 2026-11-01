import { describe, expect, it } from 'vitest';

import { MINUTES_PER_DAY, encodeTime, encodingOf, minutesIntoDay } from './time-encoding';
import { localDayInstant } from './wall-clock';

// G402: three encodings on one task, each converting differently.
describe('the task time encodings', () => {
  it('names the encoding per field', () => {
    expect(encodingOf('schedule')).toBe('day');
    expect(encodingOf('deadline')).toBe('day');
    expect(encodingOf('todoCheckedTime')).toBe('instant');
    expect(encodingOf('repeatStartDate')).toBe('instant');
    expect(encodingOf('repeatReminderDateOffset')).toBe('dayMinutes');
    expect(encodingOf('nonsense')).toBeNull();
  });

  it('encodes a day-only field as local midnight', () => {
    const date = new Date(2026, 2, 10, 15, 30);
    expect(encodeTime('schedule', date)).toBe(localDayInstant(date));
  });

  it('encodes an instant field as the exact millisecond', () => {
    const date = new Date('2026-03-10T15:30:00.000Z');
    expect(encodeTime('todoCheckedTime', date)).toBe('2026-03-10T15:30:00.000Z');
  });

  it('clamps a minute offset into the day', () => {
    expect(MINUTES_PER_DAY).toBe(1440);
    expect(encodeTime('repeatReminderDateOffset', 900)).toBe(900);
    expect(encodeTime('repeatReminderDateOffset', -5)).toBe(0);
    expect(encodeTime('repeatReminderDateOffset', 2000)).toBe(1439);
  });

  it('reads the minute of day off a wall clock', () => {
    expect(minutesIntoDay(new Date(2026, 2, 10, 17, 0))).toBe(1020);
    expect(minutesIntoDay(new Date(2026, 2, 10, 0, 30))).toBe(30);
  });
});
