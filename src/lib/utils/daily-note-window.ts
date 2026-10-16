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

/** The five buckets the daily-notes list renders, newest first. */
export type DailyNoteBucket = 'today' | 'yesterday' | 'week' | 'month' | 'earlier';

export const DAILY_NOTE_BUCKETS: readonly DailyNoteBucket[] = [
  'today',
  'yesterday',
  'week',
  'month',
  'earlier',
];

/**
 * Which bucket a note belongs in, by **whole days between its own window start and today's**.
 *
 * Counting day boundaries rather than elapsed milliseconds is what keeps a configured start time
 * honest: with a 04:00 start, yesterday's 10:00 note and today's 02:00 note are one "day" apart even
 * though under 24 hours separates them, and a midnight-based difference would file the newest note
 * under 昨天. The caller passes each note's `dailyNoteDate` (already a window start) and `now`.
 */
export function dailyNoteBucket(
  noteDate: Date,
  now: Date,
  startTime?: string | null,
): DailyNoteBucket {
  const todayStart = dayWindow(now, startTime).start;
  const noteStart = dayWindow(noteDate, startTime).start;
  const days = Math.round(
    (todayStart.getTime() - noteStart.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return 'week';
  if (noteStart.getFullYear() === todayStart.getFullYear()
    && noteStart.getMonth() === todayStart.getMonth()) {
    return 'month';
  }
  return 'earlier';
}
