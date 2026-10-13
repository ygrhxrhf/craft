import { describe, expect, it } from 'vitest';

import {
  DEFAULT_START_MINUTES,
  dayWindow,
  noteDateKey,
  parseStartMinutes,
} from './daily-note-window';

/**
 * The daily note's day window (G20). The start time moves the boundary, so a moment before the
 * start belongs to the previous day's note.
 */
describe('parsing the start time', () => {
  it('reads HH:MM into minutes', () => {
    expect(parseStartMinutes('04:00')).toBe(240);
    expect(parseStartMinutes('9:30')).toBe(570);
    expect(parseStartMinutes('00:00')).toBe(0);
  });

  it('falls back to the default for anything unusable', () => {
    expect(parseStartMinutes(null)).toBe(DEFAULT_START_MINUTES);
    expect(parseStartMinutes('')).toBe(0);
    expect(parseStartMinutes('25:00')).toBe(0);
    expect(parseStartMinutes('04:75')).toBe(0);
    expect(parseStartMinutes('noon')).toBe(0);
  });
});

describe('the day window with the default start', () => {
  it('is the ordinary calendar day', () => {
    const now = new Date(2026, 9, 14, 10, 30);
    const { start, end } = dayWindow(now, null);
    expect(start.getDate()).toBe(14);
    expect(start.getHours()).toBe(0);
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(0);
  });
});

describe('the day window with a 04:00 start', () => {
  it('puts a 02:00 moment in the previous day', () => {
    const now = new Date(2026, 9, 14, 2, 0);
    const { start } = dayWindow(now, '04:00');
    expect(start.getDate()).toBe(13);
    expect(start.getHours()).toBe(4);
  });

  it('puts a 05:00 moment in the current day', () => {
    const now = new Date(2026, 9, 14, 5, 0);
    const { start } = dayWindow(now, '04:00');
    expect(start.getDate()).toBe(14);
    expect(start.getHours()).toBe(4);
  });

  it('closes the window 24 hours after it opens', () => {
    const now = new Date(2026, 9, 14, 5, 0);
    const { start, end } = dayWindow(now, '04:00');
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe('the note date key', () => {
  it('is the calendar day the window opens on', () => {
    expect(noteDateKey(new Date(2026, 9, 14, 10, 0), null)).toBe('2026-10-14');
    // 02:00 with a 04:00 start files under the 13th.
    expect(noteDateKey(new Date(2026, 9, 14, 2, 0), '04:00')).toBe('2026-10-13');
  });
});
