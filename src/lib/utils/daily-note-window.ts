/**
 * The daily note's day window (G20). A daily note is keyed on a calendar day, but the day does not
 * have to start at midnight: the config carries a start time, and the note for "today" is the one
 * whose window contains the current moment.
 *
 * With the default start of 00:00 this is the ordinary calendar day. With a start of, say, 04:00,
 * a moment at 02:00 belongs to the previous day's note — which is what a late-night writer wants.
 */

export interface DayWindow {
  start: Date;
  end: Date;
}

/** The default start time, in minutes past midnight. */
export const DEFAULT_START_MINUTES = 0;

/** Parse `HH:MM` into minutes past midnight, falling back to the default for anything unusable. */
export function parseStartMinutes(startTime: string | null | undefined): number {
  if (!startTime) return DEFAULT_START_MINUTES;
  const match = /^(\d{1,2}):(\d{2})$/.exec(startTime.trim());
  if (!match) return DEFAULT_START_MINUTES;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return DEFAULT_START_MINUTES;
  return hours * 60 + minutes;
}

/**
 * The window the moment falls in. The day is the calendar day of `now` shifted back by the start
 * time, so a moment before the start belongs to the previous day's window.
 */
export function dayWindow(now: Date, startTime?: string | null): DayWindow {
  const startMinutes = parseStartMinutes(startTime);
  const start = new Date(now);
  start.setSeconds(0, 0);
  start.setHours(0, startMinutes, 0, 0);
  if (now.getTime() < start.getTime()) {
    // Before today's start: the window opened yesterday.
    start.setDate(start.getDate() - 1);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * The note one day earlier or later (G20's 前一天 / 后一天). Stepping by a calendar day keeps the
 * start time, so a 04:00 window moves to the next 04:00 rather than to midnight.
 */
export function shiftDay(now: Date, step: -1 | 1, startTime?: string | null): Date {
  const { start } = dayWindow(now, startTime);
  const shifted = new Date(start);
  shifted.setDate(shifted.getDate() + step);
  return shifted;
}

/** The calendar day a daily note is filed under, as the `YYYY-MM-DD` prefix the title uses. */
export function noteDateKey(now: Date, startTime?: string | null): string {
  const { start } = dayWindow(now, startTime);
  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, '0');
  const day = String(start.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
