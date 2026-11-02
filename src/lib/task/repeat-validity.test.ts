import { describe, expect, it } from 'vitest';
import { flexibleDraftValid, repeatDraftValid, repeatRuleFor, type RepeatDraft } from './repeat-validity';

const draft = (over: Partial<RepeatDraft> = {}): RepeatDraft => ({
  freq: 'daily',
  days: [],
  ...over,
});

describe('repeatDraftValid (G646: the four-tier truth table)', () => {
  it('daily is always valid — it has no sub-fields to fill', () => {
    expect(repeatDraftValid(draft({ freq: 'daily' }))).toBe(true);
  });

  it('flexible is always valid too', () => {
    expect(flexibleDraftValid()).toBe(true);
  });

  it('weekly needs at least one day', () => {
    expect(repeatDraftValid(draft({ freq: 'weekly', days: [] }))).toBe(false);
    expect(repeatDraftValid(draft({ freq: 'weekly', days: [1] }))).toBe(true);
  });

  it('monthly is satisfied by **either** days or dynamicDays (official uses &&)', () => {
    expect(repeatDraftValid(draft({ freq: 'monthly', days: [], dynamicDays: [] }))).toBe(false);
    expect(repeatDraftValid(draft({ freq: 'monthly', days: [15], dynamicDays: [] }))).toBe(true);
    expect(repeatDraftValid(draft({ freq: 'monthly', days: [], dynamicDays: [1] }))).toBe(true);
  });

  it('yearly needs **both** days and months (official uses ||, so one empty fails)', () => {
    expect(repeatDraftValid(draft({ freq: 'yearly', days: [1], months: [] }))).toBe(false);
    expect(repeatDraftValid(draft({ freq: 'yearly', days: [], months: [3] }))).toBe(false);
    expect(repeatDraftValid(draft({ freq: 'yearly', days: [1], months: [3] }))).toBe(true);
  });

  it('the monthly/yearly asymmetry is deliberate — it is the official shape, not a bug to fix', () => {
    // 同样是"只填了一个子项"：monthly 合法、yearly 不合法。
    const onlyDays = [1];
    expect(repeatDraftValid(draft({ freq: 'monthly', days: onlyDays, dynamicDays: [] }))).toBe(true);
    expect(repeatDraftValid(draft({ freq: 'yearly', days: onlyDays, months: [] }))).toBe(false);
  });

  it('an unknown frequency is not valid (never guesses)', () => {
    expect(repeatDraftValid(draft({ freq: 'hourly' as never }))).toBe(false);
  });
});

describe('repeatRuleFor (G646: picking a frequency fills the minimum valid sub-fields)', () => {
  const today = new Date('2026-11-02T09:00:00Z'); // 本地时区 2026-11-02：周一（getDay=1）、日号 2、月 11

  it('daily carries no sub-fields', () => {
    expect(JSON.parse(repeatRuleFor('daily', today))).toEqual({ freq: 'daily' });
  });

  it('weekly carries the day the picker was opened on', () => {
    // G405: weekly days are stored as the official weekday-name array.
    expect(JSON.parse(repeatRuleFor('weekly', today))).toEqual({ freq: 'weekly', days: ['monday'] });
  });

  it('monthly carries today’s day-of-month', () => {
    expect(JSON.parse(repeatRuleFor('monthly', today))).toEqual({ freq: 'monthly', byMonthDay: today.getDate() });
  });

  it('yearly carries both a day and a month, so the truth table can never be violated', () => {
    const rule = JSON.parse(repeatRuleFor('yearly', today));
    expect(rule.freq).toBe('yearly');
    expect(rule.days.length).toBeGreaterThan(0);
    expect(rule.months.length).toBeGreaterThan(0);
  });

  it('every frequency this function produces passes its own validity check', () => {
    for (const freq of ['daily', 'weekly', 'monthly', 'yearly'] as const) {
      const rule = JSON.parse(repeatRuleFor(freq, today));
      expect(
        repeatDraftValid({
          freq,
          days: rule.days ?? [],
          dynamicDays: [],
          months: rule.months ?? [],
          byMonthDay: rule.byMonthDay ?? null,
        }),
        `${freq} 造出来的规则没过自己的真值表`,
      ).toBe(true);
    }
  });
});
