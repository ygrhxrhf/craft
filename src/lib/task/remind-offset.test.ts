import { describe, expect, it } from 'vitest';
import {
  REMIND_OFFSET_STEP_MINUTES,
  REMIND_OFFSET_TIER_COUNT,
  REMIND_OFFSET_TIERS,
  isRemindOffsetTier,
  remindAtFromOffset,
  remindOffsetLabel,
} from './remind-offset';

describe('REMIND_OFFSET_TIERS (G648: the 96 tiers)', () => {
  it('has 96 tiers, 15 minutes apart, from 0 to 23:45', () => {
    expect(REMIND_OFFSET_TIER_COUNT).toBe(96);
    expect(REMIND_OFFSET_STEP_MINUTES).toBe(15);
    expect(REMIND_OFFSET_TIERS).toHaveLength(96);
    expect(REMIND_OFFSET_TIERS[0]).toBe(0);
    expect(REMIND_OFFSET_TIERS[95]).toBe(1425);
  });
});

describe('remindOffsetLabel', () => {
  it('zero is 准时', () => {
    expect(remindOffsetLabel(0)).toBe('准时');
  });

  it('whole hours say 小时', () => {
    expect(remindOffsetLabel(60)).toBe('提前 1 小时');
    expect(remindOffsetLabel(180)).toBe('提前 3 小时');
  });

  it('mixed hours and minutes print both', () => {
    expect(remindOffsetLabel(75)).toBe('提前 1 小时 15 分钟');
  });

  it('less than an hour says 分钟 only', () => {
    expect(remindOffsetLabel(15)).toBe('提前 15 分钟');
  });
});

describe('remindAtFromOffset (G648: the relative tier resolves to an absolute instant)', () => {
  it('subtracts the offset from the schedule date', () => {
    expect(remindAtFromOffset('2026-11-02T12:00:00.000Z', 60)).toBe('2026-11-02T11:00:00.000Z');
  });

  it('zero offset is the schedule moment itself', () => {
    expect(remindAtFromOffset('2026-11-02T12:00:00.000Z', 0)).toBe('2026-11-02T12:00:00.000Z');
  });

  it('an unparsable schedule yields null rather than a bogus instant', () => {
    expect(remindAtFromOffset('nope', 30)).toBeNull();
  });
});

describe('isRemindOffsetTier', () => {
  it('accepts on-grid values inside the range', () => {
    expect(isRemindOffsetTier(0)).toBe(true);
    expect(isRemindOffsetTier(15)).toBe(true);
    expect(isRemindOffsetTier(1425)).toBe(true);
  });

  it('refuses off-grid or out-of-range values', () => {
    expect(isRemindOffsetTier(7)).toBe(false);
    expect(isRemindOffsetTier(-15)).toBe(false);
    expect(isRemindOffsetTier(1440)).toBe(false);
  });
});
