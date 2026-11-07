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
  clampInterval,
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
  // G638: the new frequency's ceiling applies at switch time, not only when the field is edited.
  const interval = clampInterval(freq, rule?.interval);
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

/**
 * G266 —— 周末处理是**两条互斥勾选菜单项**（`on-weekends` / `skip-weekends`），不是开关：
 * `tasks.also.on.weekends`「周末也有」 与 `tasks.skip.weekends`「跳过周末」，各带一枚勾选态。
 * 只有 daily／monthly 的字段集里有这一层（`daily-weekend-items`）。
 */
export const WEEKEND_OPTIONS: readonly { id: 'on-weekends' | 'skip-weekends'; label: string; key: string }[] = [
  { id: 'on-weekends', label: '周末也有', key: 'tasks.also.on.weekends' },
  { id: 'skip-weekends', label: '跳过周末', key: 'tasks.skip.weekends' },
] as const;

export type WeekendOptionId = (typeof WEEKEND_OPTIONS)[number]['id'];

/** Which of the two rows is ticked; `null` when the rule cannot carry the layer at all. */
export function weekendOptionOf(raw: string | null | undefined): WeekendOptionId | null {
  const rule = parseRecurrence(raw);
  if (!rule || (rule.freq !== 'daily' && rule.freq !== 'monthly')) return null;
  return rule.skipWeekends ? 'skip-weekends' : 'on-weekends';
}

/** Write the picked row; the two are mutually exclusive, so one write settles both. */
export function withWeekendOption(raw: string | null | undefined, option: WeekendOptionId): string {
  return patchRuleAxis(raw, { skipWeekends: option === 'skip-weekends' });
}

/**
 * G266 —— 间隔菜单的回退规则：`T = (An) => { const ft = interval ?? 1; ft > An ? 1 : … }`。
 * **往小选**（选中的档小于当前间隔）时官方把间隔重置为 1，而不是落到选中的那一档；这一格是
 * 官方自己的怪癖，照抄。
 */
export function nextInterval(current: number | undefined, selected: number): number {
  const from = current ?? 1;
  return from > selected ? 1 : selected;
}

/** Merge an interval pick into the rule; `1` is the absent value (no interval key). */
export function patchInterval(raw: string | null | undefined, selected: number): string {
  const rule = parseRecurrence(raw) ?? { freq: 'daily' as RecurrenceFrequency };
  const interval = nextInterval(rule.interval, selected);
  const next: Record<string, unknown> = { ...(rule as unknown as Record<string, unknown>) };
  if (interval > 1) next.interval = interval;
  else delete next.interval;
  return JSON.stringify(next);
}
