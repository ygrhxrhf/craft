/**
 * G406/G405: the writers behind the repeat rule picker. The rule model (`recurrence.ts`) already
 * stores `days: number[]` (weekly weekdays, monthly/yearly day numbers), `months: number[]` and
 * `dynamicDays: {type, selector}[]` (月末 / 第一个周五 / 第 3 个周三), but nothing in the UI could
 * produce them — the panel had presets, an interval box and the anchor only. These helpers are that
 * missing write path, kept pure so the reset and ordering rules are testable.
 */
import {
  MONDAY_FIRST,
  WEEKDAY_LABELS,
  parseRecurrence,
  type DynamicDay,
  type DynamicDaySelector,
  type RecurrenceAnchor,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from './recurrence';

export const RECURRENCE_FREQUENCIES: readonly RecurrenceFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
};

/** Sunday-first index of an official weekday name. */
const SUNDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const labelFor = (name: string): string => WEEKDAY_LABELS[SUNDAY_INDEX[name]] ?? '';

/** The weekday chips run Monday-first, like the official picker and the calendar grid. */
export const WEEKDAY_PICK: readonly { value: number; label: string }[] = MONDAY_FIRST.map((name) => ({
  value: SUNDAY_INDEX[name],
  label: labelFor(name),
}));

/** Day-of-month chips, 1–31. */
export const DAY_NUMBERS: readonly number[] = Array.from({ length: 31 }, (_, index) => index + 1);

/** Month chips for the yearly rule, 1–12. */
export const MONTH_PICK: readonly { value: number; label: string }[] = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1} 月`,
}));

export const SELECTOR_OPTIONS: readonly { value: DynamicDaySelector; label: string }[] = [
  { value: 'first', label: '第一个' },
  { value: 2, label: '第二个' },
  { value: 3, label: '第三个' },
  { value: 4, label: '第四个' },
  { value: 5, label: '第五个' },
  { value: 'last', label: '最后一个' },
];

/** The targets a relative day can point at: the 日号 axis plus the seven weekdays. */
export const DYNAMIC_TARGETS: readonly { value: string; label: string }[] = [
  { value: 'day', label: '日' },
  ...MONDAY_FIRST.map((name) => ({ value: name as string, label: labelFor(name) })),
];

/** Add one value to a set, or remove it when already present; always sorted. */
export function toggleNumber(values: readonly number[] | undefined, value: number): number[] {
  const current = new Set(values ?? []);
  if (current.has(value)) current.delete(value);
  else current.add(value);
  return [...current].sort((a, b) => a - b);
}

export function sameDynamicDay(a: DynamicDay, b: DynamicDay): boolean {
  return a.type === b.type && a.selector === b.selector;
}

export function toggleDynamicDay(values: readonly DynamicDay[] | undefined, entry: DynamicDay): DynamicDay[] {
  const current = [...(values ?? [])];
  const at = current.findIndex((item) => sameDynamicDay(item, entry));
  if (at >= 0) current.splice(at, 1);
  else current.push(entry);
  return current;
}

/**
 * Which axes the picker shows for one frequency. `days` carries different meanings: weekday
 * numbers when weekly, day-of-month numbers when monthly or yearly.
 */
export function axesFor(freq: RecurrenceFrequency): { days: boolean; months: boolean; dynamic: boolean } {
  if (freq === 'weekly') return { days: true, months: false, dynamic: false };
  if (freq === 'monthly') return { days: true, months: false, dynamic: true };
  if (freq === 'yearly') return { days: true, months: true, dynamic: true };
  return { days: false, months: false, dynamic: false };
}

/**
 * Switching frequency drops the axes the new one cannot carry: a stored weekday number read as a
 * day-of-month would schedule the wrong day, so the picker starts a fresh rule per axis and keeps
 * only the anchor, the interval and the `skipWeekends` that daily/monthly still mean.
 */
export function ruleWithFrequency(raw: string | null | undefined, freq: RecurrenceFrequency): string {
  const rule = parseRecurrence(raw);
  const next: Record<string, unknown> = { freq, type: rule?.type ?? 'fixed' };
  const interval = rule?.interval ?? 1;
  if (interval > 1) next.interval = interval;
  if ((freq === 'daily' || freq === 'monthly') && rule?.skipWeekends) next.skipWeekends = true;
  return JSON.stringify(next);
}

/**
 * Choosing the anchor on the way to a frequency still has to write a complete rule: a stored
 * `{"type":"fixed"}` without `freq` fails `parseRecurrence`, which blanked the 「重复…」 row and
 * stranded the picker. Daily is the frequency the anchor step leads into.
 */
export function ruleWithAnchor(raw: string | null | undefined, anchor: RecurrenceAnchor): string {
  const rule = parseRecurrence(raw);
  const next: Record<string, unknown> = { freq: rule?.freq ?? 'daily', type: anchor };
  const interval = rule?.interval ?? 1;
  if (interval > 1) next.interval = interval;
  if ((next.freq === 'daily' || next.freq === 'monthly') && rule?.skipWeekends) next.skipWeekends = true;
  if (rule?.days?.length) next.days = rule.days;
  if (rule?.months?.length) next.months = rule.months;
  if (rule?.dynamicDays?.length) next.dynamicDays = rule.dynamicDays;
  return JSON.stringify(next);
}

/** Merge one axis into the stored rule; an empty array or `false` removes the key. */
export function patchRuleAxis(
  raw: string | null | undefined,
  patch: Partial<Pick<RecurrenceRule, 'days' | 'months' | 'dynamicDays' | 'skipWeekends' | 'byMonthDay'>>,
): string {
  const rule = parseRecurrence(raw) ?? { freq: 'monthly' as RecurrenceFrequency };
  const next: Record<string, unknown> = { ...(rule as unknown as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === false || (Array.isArray(value) && value.length === 0)) delete next[key];
    else next[key] = value;
  }
  return JSON.stringify(next);
}
