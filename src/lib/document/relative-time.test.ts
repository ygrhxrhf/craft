import { describe, expect, it } from 'vitest';

import { relativeParts, relativeTime } from './relative-time';

/**
 * The info panel's relative time (G202). The unit is the largest whole one that fits, rendered by
 * the zh-CN relative formatter.
 */
describe('choosing the unit', () => {
  const now = Date.parse('2026-10-14T12:00:00.000Z');

  it('uses years for a span of years', () => {
    const threeYearsAgo = Date.parse('2023-10-14T12:00:00.000Z');
    expect(relativeParts(threeYearsAgo, now)).toEqual({ unit: 'year', value: -3 });
  });

  it('uses days for a span of days', () => {
    const threeDaysAgo = Date.parse('2026-10-11T12:00:00.000Z');
    expect(relativeParts(threeDaysAgo, now)).toEqual({ unit: 'day', value: -3 });
  });

  it('falls back to seconds under a minute, and zero under a second', () => {
    expect(relativeParts(now - 30_000, now)).toEqual({ unit: 'second', value: -30 });
    expect(relativeParts(now, now)).toEqual({ unit: 'second', value: 0 });
  });
});

describe('formatting', () => {
  const now = Date.parse('2026-10-14T12:00:00.000Z');

  it('renders a past time in words', () => {
    expect(relativeTime('2023-10-14T12:00:00.000Z', now)).toContain('3');
    expect(relativeTime('2023-10-14T12:00:00.000Z', now)).toContain('年');
  });

  it('accepts a Date and a number as well as a string', () => {
    expect(relativeTime(new Date(now - 86_400_000), now)).toBe(relativeTime(now - 86_400_000, now));
  });

  it('returns an empty string for an unparsable value rather than inventing a time', () => {
    expect(relativeTime('不是时间', now)).toBe('');
  });
});
