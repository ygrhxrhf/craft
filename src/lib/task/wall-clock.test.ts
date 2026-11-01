import { describe, expect, it } from 'vitest';

import { fromDayInputValue, fromLocalDayInstant, localDayInstant, toDayInputValue } from './wall-clock';

// G401: a date-only value is the UTC instant of local midnight, so the same wall-clock day
// survives a timezone change.
describe('the local-midnight pair', () => {
  it('round-trips a calendar day', () => {
    const instant = localDayInstant(new Date(2026, 9, 9, 15, 30));
    expect(fromLocalDayInstant(instant)?.getDate()).toBe(9);
    expect(fromLocalDayInstant(instant)?.getHours()).toBe(0);
  });

  it('prints the local day, never the UTC day', () => {
    const instant = localDayInstant(new Date(2026, 0, 1));
    expect(toDayInputValue(instant)).toBe('2026-01-01');
    // A day near midnight keeps its own date instead of flipping with the offset.
    const late = localDayInstant(new Date(2026, 11, 31, 23, 59));
    expect(toDayInputValue(late)).toBe('2026-12-31');
  });

  it('parses a day input back to local midnight', () => {
    const parsed = fromDayInputValue('2026-03-10');
    expect(parsed).toBe(localDayInstant(new Date(2026, 2, 10)));
  });

  it('rejects an impossible day', () => {
    expect(fromDayInputValue('2026-02-30')).toBeNull();
    expect(fromDayInputValue('')).toBeNull();
    expect(fromLocalDayInstant('nonsense')).toBeNull();
  });
});
