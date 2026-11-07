import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { describeRecurrence, nextOccurrence, parseRecurrence } from './recurrence';
import {
  DAY_NUMBERS,
  DYNAMIC_TARGETS,
  MONTH_PICK,
  RECURRENCE_FREQUENCIES,
  SELECTOR_OPTIONS,
  WEEKDAY_PICK,
  axesFor,
  patchRuleAxis,
  ruleWithAnchor,
  ruleWithFrequency,
  toggleDynamicDay,
  toggleNumber,
} from './recurrence-picker';

/**
 * G406: the rule model has carried `days`, `months` and `dynamicDays` for a while, but the panel had
 * no writer for any of them. These are the writers the repeat picker drives.
 */
describe('the picker rosters', () => {
  it('offers the four official frequencies', () => {
    expect([...RECURRENCE_FREQUENCIES]).toEqual(['daily', 'weekly', 'monthly', 'yearly']);
  });

  it('runs the weekday chips Monday-first', () => {
    expect(WEEKDAY_PICK.map((day) => day.label)).toEqual(['周一', '周二', '周三', '周四', '周五', '周六', '周日']);
    // Sunday is the 7th chip and keeps the stored Sunday-first index.
    expect(WEEKDAY_PICK[6]).toEqual({ value: 0, label: '周日' });
  });

  it('carries 1–31 day numbers, twelve months and the day-plus-weekday targets', () => {
    expect(DAY_NUMBERS.length).toBe(31);
    expect(MONTH_PICK.map((month) => month.label)).toEqual([
      '1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月',
    ]);
    expect(DYNAMIC_TARGETS.map((target) => target.value)).toEqual([
      'day', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    ]);
    expect(SELECTOR_OPTIONS.map((option) => option.label)).toEqual([
      '第一个', '第二个', '第三个', '第四个', '第五个', '最后一个',
    ]);
  });
});

describe('the axis toggles', () => {
  it('adds, removes and sorts one number', () => {
    expect(toggleNumber([15], 3)).toEqual([3, 15]);
    expect(toggleNumber([3, 15], 15)).toEqual([3]);
    expect(toggleNumber(undefined, 20)).toEqual([20]);
  });

  it('adds and removes one relative day', () => {
    const added = toggleDynamicDay([], { type: 'friday', selector: 'last' });
    expect(added).toEqual([{ type: 'friday', selector: 'last' }]);
    expect(toggleDynamicDay(added, { type: 'friday', selector: 'last' })).toEqual([]);
  });

  it('shows the axes each frequency can carry', () => {
    expect(axesFor('daily')).toEqual({ days: false, months: false, dynamic: false });
    expect(axesFor('weekly')).toEqual({ days: true, months: false, dynamic: false });
    expect(axesFor('monthly')).toEqual({ days: true, months: false, dynamic: true });
    expect(axesFor('yearly')).toEqual({ days: true, months: true, dynamic: true });
  });
});

describe('writing the rule', () => {
  it('builds 「每月 3 日、15 日」 and reads it back the same way', () => {
    const raw = patchRuleAxis('{"freq":"monthly","type":"fixed"}', { days: [3, 15] });
    expect(parseRecurrence(raw)?.days).toEqual([3, 15]);
    expect(describeRecurrence(raw)).toBe('每月 3 日、15 日重复');
  });

  it('stacks a relative day onto the day numbers', () => {
    let raw = patchRuleAxis('{"freq":"monthly"}', { days: [3, 15] });
    raw = patchRuleAxis(raw, { dynamicDays: [{ type: 'friday', selector: 'last' }] });
    expect(describeRecurrence(raw)).toBe('每月 3 日、15 日、最后一个周五重复');
  });

  it('removes the key when the axis is emptied', () => {
    const raw = patchRuleAxis('{"freq":"monthly","days":[3,15]}', { days: [] });
    expect(JSON.parse(raw)).not.toHaveProperty('days');
  });

  it('drops the legacy single day number when the array is picked', () => {
    const raw = patchRuleAxis('{"freq":"monthly","byMonthDay":9}', { days: [3], byMonthDay: undefined });
    const parsed = JSON.parse(raw);
    expect(parsed.days).toEqual([3]);
    expect(parsed).not.toHaveProperty('byMonthDay');
  });

  it('starts a fresh rule when the frequency changes, keeping anchor and interval', () => {
    const weekly = '{"freq":"weekly","type":"flexible","interval":2,"days":[1,3]}';
    expect(JSON.parse(ruleWithFrequency(weekly, 'monthly'))).toEqual({ freq: 'monthly', type: 'flexible', interval: 2 });
    // `skipWeekends` only survives where the official field set allows it.
    expect(JSON.parse(ruleWithFrequency('{"freq":"monthly","skipWeekends":true}', 'daily'))).toEqual({
      freq: 'daily',
      type: 'fixed',
      skipWeekends: true,
    });
    expect(JSON.parse(ruleWithFrequency('{"freq":"monthly","skipWeekends":true}', 'yearly'))).not.toHaveProperty(
      'skipWeekends',
    );
  });

  it('resets an interval above the new frequency ceiling to 1 (G638)', () => {
    // Weekly allows 52 while monthly allows 12, so 40 is swallowed when the frequency changes.
    expect(JSON.parse(ruleWithFrequency('{"freq":"weekly","interval":40}', 'monthly'))).not.toHaveProperty(
      'interval',
    );
    // 20 is still legal weekly, so it survives the switch.
    expect(JSON.parse(ruleWithFrequency('{"freq":"daily","interval":20}', 'weekly'))).toEqual({
      freq: 'weekly',
      type: 'fixed',
      interval: 20,
    });
  });

  it('schedules the occurrence the picker describes', () => {
    // 每月最后一个周五：本地口径里 monthly 的下一发落在**下一个月**（既有行为，见 recurrence.test.ts），
    // 所以从 2026-11-03 起算是 12 月的最后一个周五 = 2026-12-25。
    const raw = '{"freq":"monthly","dynamicDays":[{"type":"friday","selector":"last"}],"type":"fixed"}';
    const next = nextOccurrence(raw, new Date('2026-11-03T00:00:00.000Z'));
    expect(next?.toISOString().slice(0, 10)).toBe('2026-12-25');
  });
});

describe('the popover wires the picker in', () => {
  const popover = readFileSync(
    fileURLToPath(new URL('../../components/task/TaskDatePopover.tsx', import.meta.url)),
    'utf8',
  );

  it('writes a parseable rule when only the anchor was chosen', () => {
    // The old code stored `{"type":"fixed"}` — no `freq`, so parseRecurrence rejected it and the
    // 「重复…」 row went blank.
    expect(describeRecurrence('{"type":"fixed"}')).toBeNull();
    const written = ruleWithAnchor(null, 'fixed');
    expect(parseRecurrence(written)?.freq).toBe('daily');
    expect(parseRecurrence(written)?.type).toBe('fixed');
    expect(describeRecurrence(written)).toBe('每天重复');
  });

  it('keeps the axes the rule already carries when the anchor changes', () => {
    const raw = '{"freq":"monthly","type":"fixed","interval":2,"days":[3,15],"skipWeekends":true}';
    const next = parseRecurrence(ruleWithAnchor(raw, 'flexible'));
    expect(next).toMatchObject({ freq: 'monthly', type: 'flexible', interval: 2, days: [3, 15], skipWeekends: true });
  });

  it('renders it inside the 「自定义…」 drawer', () => {
    expect(popover).toContain('import { RecurrenceRuleEditor }');
    expect(popover).toContain('<RecurrenceRuleEditor');
    expect(popover.indexOf('<RecurrenceRuleEditor')).toBeGreaterThan(popover.indexOf('repeat-custom'));
    // The anchor step goes through the writer that always keeps `freq`.
    expect(popover).toContain("recurrence.onChange(ruleWithAnchor(recurrence.value, 'fixed'))");
    // And a rule that cannot be described still shows the entry label.
    expect(popover).toContain("|| '重复…'");
  });
});
