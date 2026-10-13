import { describe, expect, it } from 'vitest';

import { dayInSpan, spanOf } from './week-view';

describe('the week', () => {
  it('runs Monday to Sunday around the selected day', () => {
    const span = spanOf(new Date(2026, 9, 14), 'week');
    expect(span.start.getDate()).toBe(12);
    expect(span.start.getDay()).toBe(1);
    expect(span.end.getDate()).toBe(18);
    expect(span.end.getDay()).toBe(0);
  });

  it('keeps a Monday as the start of its own week', () => {
    const span = spanOf(new Date(2026, 9, 12), 'week');
    expect(span.start.getDate()).toBe(12);
    expect(span.end.getDate()).toBe(18);
  });
});

describe('the month', () => {
  it('covers every day of the selected month', () => {
    const span = spanOf(new Date(2026, 9, 14), 'month');
    expect(span.start.getDate()).toBe(1);
    expect(span.end.getDate()).toBe(31);
    expect(dayInSpan(new Date(2026, 9, 31), span)).toBe(true);
    expect(dayInSpan(new Date(2026, 10, 1), span)).toBe(false);
  });
});
