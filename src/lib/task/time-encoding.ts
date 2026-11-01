/**
 * G402: one task carries three different time encodings, and each converts differently.
 *
 * - `schedule` / `deadline` are **day-only**: they go through the local-midnight pair, so the
 *   same wall-clock day survives a timezone change.
 * - `todoCheckedTime` / `repeat.startDate` are **real instants**: the exact millisecond matters.
 * - `repeat.reminder.dateOffset` is **minutes into the day** (0…1439), which is how a reminder
 *   keeps its time-of-day when the task moves.
 *
 * Mixing these up is what makes a date drift, so the encoding is a named type rather than a bare
 * string, and the conversion is the only place that reads it.
 */

import { localDayInstant } from '@/lib/task/wall-clock';

export type TimeEncoding = 'day' | 'instant' | 'dayMinutes';

export const DAY_ONLY_FIELDS = ['schedule', 'deadline'] as const;
export const INSTANT_FIELDS = ['todoCheckedTime', 'repeatStartDate'] as const;
export const DAY_MINUTES_FIELDS = ['repeatReminderDateOffset'] as const;

/** Minutes in a day — the ceiling for a `dateOffset`. */
export const MINUTES_PER_DAY = 24 * 60;

export function encodingOf(field: string): TimeEncoding | null {
  if ((DAY_ONLY_FIELDS as readonly string[]).includes(field)) return 'day';
  if ((INSTANT_FIELDS as readonly string[]).includes(field)) return 'instant';
  if ((DAY_MINUTES_FIELDS as readonly string[]).includes(field)) return 'dayMinutes';
  return null;
}

/** Encode a value for the wire, per the field's encoding. */
export function encodeTime(field: string, value: Date | number | null): string | number | null {
  if (value === null) return null;
  const encoding = encodingOf(field);
  if (encoding === 'day' && value instanceof Date) return localDayInstant(value);
  if (encoding === 'instant' && value instanceof Date) return value.toISOString();
  if (encoding === 'dayMinutes' && typeof value === 'number') {
    return Math.min(MINUTES_PER_DAY - 1, Math.max(0, Math.trunc(value)));
  }
  return null;
}

/** The minute-of-day a `dateOffset` means for a given wall clock. */
export function minutesIntoDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}
