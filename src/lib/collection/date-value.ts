/**
 * G394: the official `date` column validates `value instanceof Date`. Locally the column is a
 * `TimestamptzString`, so the equivalent boundary check is "the value must parse as a date" —
 * an unparsable value is refused instead of being stored as a broken string.
 *
 * Returns the ISO instant to store, or `null` when the value is not a date at all.
 */
export function normalizeDateValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Whether a value can be stored in a date column at all. */
export function isValidDateValue(value: unknown): boolean {
  return normalizeDateValue(value) !== null;
}
