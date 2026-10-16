import { describe, expect, it } from 'vitest';

import {
  DEFAULT_START_MINUTES,
  dailyNoteBucket,
  dayWindow,
  noteDateKey,
  parseStartMinutes,
  shiftDay,
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

describe('stepping a day', () => {
  it('moves to the previous and the next calendar day', () => {
    const now = new Date(2026, 9, 14, 10, 30);
    expect(shiftDay(now, -1).getDate()).toBe(13);
    expect(shiftDay(now, 1).getDate()).toBe(15);
  });

  it('keeps the start time, so a 04:00 window stays at 04:00', () => {
    const now = new Date(2026, 9, 14, 5, 0);
    const next = shiftDay(now, 1, '04:00');
    expect(next.getDate()).toBe(15);
    expect(next.getHours()).toBe(4);
  });

  it('crosses a month boundary', () => {
    const now = new Date(2026, 9, 31, 12, 0);
    const next = shiftDay(now, 1);
    expect(next.getMonth()).toBe(10);
    expect(next.getDate()).toBe(1);
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

describe('the list buckets follow the configured start time', () => {
  it('files a note under today when its window contains the moment', () => {
    const now = new Date(2026, 9, 14, 10, 0);
    expect(dailyNoteBucket(new Date(2026, 9, 14, 0, 0), now, null)).toBe('today');
  });

  it('counts whole windows, so a 04:00 start keeps last night\'s note under today', () => {
    // 本批修掉的那条真错：起始 04:00 且**此刻还没到 04:00** 时，当前窗口是「昨天 04:00 起」。
    // 旧的午夜分组会拿 14 日 00:00 当"今天"、把该笔记归到「昨天」；按窗口起点算则是「今天」。
    const beforeStart = new Date(2026, 9, 14, 2, 0);
    expect(dailyNoteBucket(new Date(2026, 9, 13, 4, 0), beforeStart, '04:00')).toBe('today');
    // 午夜起始（默认）下，同一时刻的笔记确实属于昨天。
    expect(dailyNoteBucket(new Date(2026, 9, 13, 4, 0), beforeStart, null)).toBe('yesterday');
  });

  it('walks back through yesterday, the week and the month', () => {
    const now = new Date(2026, 9, 14, 10, 0);
    expect(dailyNoteBucket(new Date(2026, 9, 13, 10, 0), now, null)).toBe('yesterday');
    expect(dailyNoteBucket(new Date(2026, 9, 11, 10, 0), now, null)).toBe('week');
    expect(dailyNoteBucket(new Date(2026, 9, 3, 10, 0), now, null)).toBe('month');
    expect(dailyNoteBucket(new Date(2026, 8, 20, 10, 0), now, null)).toBe('earlier');
  });
});
