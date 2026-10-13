/**
 * The info panel's relative time (G202). The three property rows read 「已创建: 3 年前」 —
 * a live relative time, not the fixed 「今天」/「刚刚」 the build used to print. The unit is
 * chosen by the largest whole unit that fits, which is what `Intl.RelativeTimeFormat` renders.
 */
export type RelativeUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

const UNITS: { unit: RelativeUnit; ms: number }[] = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
];

const formatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });

/**
 * The largest unit whose magnitude is at least one, and the rounded count in that unit. A time
 * less than a second in the past reads as 「刚刚」's input — zero seconds — which the formatter
 * renders as 「现在」.
 */
export function relativeParts(at: number, now: number): { unit: RelativeUnit; value: number } {
  const diff = at - now;
  for (const { unit, ms } of UNITS) {
    if (Math.abs(diff) >= ms) {
      return { unit, value: Math.round(diff / ms) };
    }
  }
  return { unit: 'second', value: 0 };
}

/** Format a timestamp relative to now, e.g. 「3 年前」 or 「刚刚」. */
export function relativeTime(at: number | string | Date, now: number = Date.now()): string {
  const instant = at instanceof Date ? at.getTime() : typeof at === 'string' ? Date.parse(at) : at;
  if (Number.isNaN(instant)) return '';
  const { unit, value } = relativeParts(instant, now);
  return formatter.format(value, unit);
}
