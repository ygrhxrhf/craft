/**
 * G401: date-only values are stored as the UTC instant of **local** midnight — the official
 * `V5`/`VE` pair. Writing `2026-10-09` at any offset stores the same wall-clock day, so a task
 * scheduled for the 9th reads as the 9th wherever it is opened.
 *
 * All day-only conversions go through this pair; ad-hoc `new Date(value)` on a stored day is
 * what lets a date drift by one across timezones.
 */

/** The instant a local calendar day starts, as the ISO string the column stores. */
export function localDayInstant(date: Date): string {
  const local = new Date(date);
  local.setHours(0, 0, 0, 0);
  return local.toISOString();
}

/** The local calendar day an ISO instant falls on, as a `Date` at local midnight. */
export function fromLocalDayInstant(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

/** `YYYY-MM-DD` for a date input, in local terms (never the UTC day). */
export function toDayInputValue(value: string | null | undefined): string {
  const day = fromLocalDayInstant(value);
  if (!day) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/** A `YYYY-MM-DD` from a date input → the stored local-midnight instant. */
export function fromDayInputValue(value: string): string | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const local = new Date(year, month - 1, day);
  if (local.getFullYear() !== year || local.getMonth() !== month - 1 || local.getDate() !== day) return null;
  return localDayInstant(local);
}
