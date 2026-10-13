/**
 * 显示周视图 / 显示月视图 (`calendar.show.week` / `calendar.show.month`). The week runs Monday to
 * Sunday, matching the weekday order the catalog lists, and the month is every day of the selected
 * day's month.
 */
export type CalendarSpan = 'week' | 'month';

export function spanOf(selected: Date, span: CalendarSpan): { start: Date; end: Date } {
  const start = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
  if (span === 'month') {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { start: new Date(start.getFullYear(), start.getMonth(), 1), end };
  }
  const monday = new Date(start);
  const offset = (start.getDay() + 6) % 7;
  monday.setDate(start.getDate() - offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

/** Whether a calendar day falls inside the span, compared by its own date rather than the instant. */
export function dayInSpan(day: Date, span: { start: Date; end: Date }): boolean {
  const value = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  return value >= span.start.getTime() && value <= span.end.getTime();
}
