export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type RecurrenceAnchor = 'fixed' | 'flexible';

export interface RecurrenceRule {
  freq: RecurrenceFrequency;
  /**
   * G256: `fixed` advances from the scheduled date (the official default label set),
   * `flexible` advances from the moment the task is completed. Absent means `fixed` —
   * the behaviour every rule written before this field existed already had.
   */
  type?: RecurrenceAnchor;
  /** G404: every N units; absent means 1. */
  interval?: number;
  /** Weekly: 0 = Sunday through 6 = Saturday. */
  days?: number[];
  /** Monthly: 1 to 31, clamped to the length of the target month. */
  byMonthDay?: number;
  /** Inclusive upper bound, ISO date or datetime. */
  until?: string;
}

/** G404: the official per-frequency ceiling for `interval`. */
export const INTERVAL_MAX: Record<RecurrenceFrequency, number> = {
  daily: 31,
  weekly: 52,
  monthly: 12,
  yearly: 10,
};

/** Changing frequency resets an out-of-range interval to 1, as the official picker does. */
export function clampInterval(freq: RecurrenceFrequency, interval: number | undefined): number {
  if (interval === undefined) return 1;
  const max = INTERVAL_MAX[freq];
  if (!Number.isInteger(interval) || interval < 1 || interval > max) return 1;
  return interval;
}

const FREQUENCIES: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

export function parseRecurrence(raw: string | null | undefined): RecurrenceRule | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const rule = parsed as Record<string, unknown>;
  if (typeof rule.freq !== 'string' || !FREQUENCIES.includes(rule.freq as RecurrenceFrequency)) return null;

  if (rule.days !== undefined) {
    if (!Array.isArray(rule.days)) return null;
    // G405：官方存的是**星期名小写全字符串数组**（["sunday"…"saturday"]），读侧按
    // `typeof === "string"` 过滤 ⇒ **非字符串元素被静默丢弃**（不是整条判废）。
    // 本地写入形是数字 0–6，两种都收：名字映射成数字，其余元素丢掉。
    // 只有 weekly 的 `days` 是星期；yearly 的 `days` 是日号（G646），不能按星期归一。
    if (rule.freq === 'weekly') {
      const normalized = normalizeWeekdays(rule.days);
      if (normalized.length === 0 && rule.days.length > 0) return null;
      rule.days = normalized;
    }
  }
  if (rule.byMonthDay !== undefined && !(Number.isInteger(rule.byMonthDay) && (rule.byMonthDay as number) >= 1 && (rule.byMonthDay as number) <= 31)) {
    return null;
  }
  if (rule.until !== undefined && typeof rule.until !== 'string') return null;
  if (rule.type !== undefined && rule.type !== 'fixed' && rule.type !== 'flexible') return null;
  if (rule.interval !== undefined) {
    const interval = rule.interval as number;
    if (typeof interval !== 'number' || !Number.isInteger(interval)) return null;
    if (interval < 1 || interval > INTERVAL_MAX[rule.freq as RecurrenceFrequency]) return null;
  }

  const result: RecurrenceRule = { freq: rule.freq as RecurrenceFrequency };
  if (rule.type === 'fixed' || rule.type === 'flexible') result.type = rule.type;
  if (rule.interval !== undefined) result.interval = rule.interval as number;
  if (Array.isArray(rule.days)) result.days = rule.days as number[];
  if (rule.byMonthDay !== undefined) result.byMonthDay = rule.byMonthDay as number;
  if (typeof rule.until === 'string') result.until = rule.until;
  return result;
}

/** G405：官方星期名（小写、全名）。 */
export const OFFICIAL_WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/**
 * G405 —— 归一星期数组：名字映射成 0–6，数字原样保留，**其余元素静默丢弃**
 * （官方读侧 `typeof === "string"` 过滤的等价行为）。
 */
export function normalizeWeekdays(values: readonly unknown[]): number[] {
  const out: number[] = [];
  for (const value of values) {
    if (typeof value === 'string') {
      const index = (OFFICIAL_WEEKDAY_NAMES as readonly string[]).indexOf(value.toLowerCase());
      if (index >= 0) out.push(index);
      continue;
    }
    if (isWeekdayNumber(value)) out.push(value as number);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

function isWeekdayNumber(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6;
}

/**
 * G405 —— 写侧用官方形：星期名小写全字符串数组。内部逻辑只认 0–6，两个形只在读写边界转换；
 * 非法的数字被丢掉（与读侧"静默丢弃"同一个兜底）。
 */
export function serializeWeekdays(days: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const day of days) {
    if (isWeekdayNumber(day)) out.push(OFFICIAL_WEEKDAY_NAMES[day as number]);
  }
  return [...new Set(out)];
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * G653: two week-start conventions are in play. The stored `days` array keeps the official
 * Sunday-first numbering (`sunday:0 … saturday:6`), while the **calendar grid and the weekday
 * picker** start on Monday. These two helpers are the only place the two are converted, so a
 * stored day never gets read as the wrong weekday.
 */
export const SUNDAY_FIRST = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export const MONDAY_FIRST = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

/** A Sunday-first index → its Monday-first column (Mon 0 … Sun 6). */
export function toMondayFirst(sundayFirst: number): number {
  return (sundayFirst + 6) % 7;
}

/** A Monday-first column → the stored Sunday-first index. */
export function fromMondayFirst(mondayFirst: number): number {
  return (mondayFirst + 1) % 7;
}

/** The Monday that opens the week containing `date`, at local midnight. */
export function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - toMondayFirst(copy.getDay()));
  return copy;
}

export function describeRecurrence(raw: string | null | undefined): string | null {
  const rule = parseRecurrence(raw);
  if (!rule) return null;
  const step = rule.interval ?? 1;
  const anchor = rule.type === 'flexible' ? '（完成时起算）' : '';
  const every =
    rule.freq === 'daily'
      ? step > 1 ? `每 ${step} 天` : '每天'
      : rule.freq === 'weekly'
        ? step > 1 ? `每 ${step} 周` : '每周'
        : rule.freq === 'monthly'
          ? step > 1 ? `每 ${step} 个月` : '每月'
          : step > 1 ? `每 ${step} 年` : '每年';

  if (rule.freq === 'weekly' && rule.days?.length) {
    return `${every}：${rule.days.map((day) => WEEKDAY_LABELS[day] ?? '').filter(Boolean).join('、')}${anchor}`;
  }
  if (rule.freq === 'monthly' && rule.byMonthDay) {
    return `${every} ${rule.byMonthDay} 日重复${anchor}`;
  }
  return `${every}重复${anchor}`;
}

/** The preset rules the task scheduler offers; the value is the stored JSON text. */
export const RECURRENCE_PRESETS: { label: string; value: string | null }[] = [
  { label: '不重复', value: null },
  { label: '每天', value: '{"freq":"daily"}' },
  { label: '每周', value: '{"freq":"weekly"}' },
  { label: '每月', value: '{"freq":"monthly"}' },
  { label: '每年', value: '{"freq":"yearly"}' },
];

/**
 * G374: the repeat sub-menu labels carry the date being scheduled —
 * 「每天」/「每个工作日（周一至周五）」/「每周 (周五)」/「每月 (9.)」/「每年 (10月9日)」.
 * Without a date the labels fall back to the plain frequency names.
 */
export function recurrencePresetsFor(date: Date | null): { label: string; value: string }[] {
  const weekday = date ? (date.getDay() + 6) % 7 : null; // Monday = 0
  const monthDay = date ? date.getDate() : null;
  const month = date ? date.getMonth() + 1 : null;
  const weekdayLabel = weekday === null ? null : '一二三四五六日'[weekday];

  return [
    { label: '每天', value: JSON.stringify({ freq: 'daily' }) },
    {
      label: '每个工作日（周一至周五）',
      value: JSON.stringify({ freq: 'weekly', days: serializeWeekdays([1, 2, 3, 4, 5]) }),
    },
    {
      label: weekdayLabel ? `每周 (周${weekdayLabel})` : '每周',
      value: JSON.stringify(
        weekday === null ? { freq: 'weekly' } : { freq: 'weekly', days: serializeWeekdays([(weekday + 1) % 7]) },
      ),
    },
    {
      label: monthDay ? `每月 (${monthDay}.)` : '每月',
      value: JSON.stringify(monthDay ? { freq: 'monthly', byMonthDay: monthDay } : { freq: 'monthly' }),
    },
    {
      label: date ? `每年 (${month}月${monthDay}日)` : '每年',
      value: JSON.stringify({ freq: 'yearly' }),
    },
  ];
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallOf(date: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
  };
}

/** Milliseconds the zone is ahead of UTC at that instant; two passes settle a DST edge. */
function zoneOffsetAt(timeZone: string, instant: Date): number {
  const wall = wallOf(instant, timeZone);
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second) - instant.getTime();
}

function wallToInstant(wall: WallClock, timeZone: string): number {
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  const firstPass = asUtc - zoneOffsetAt(timeZone, new Date(asUtc));
  return asUtc - zoneOffsetAt(timeZone, new Date(firstPass));
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

function untilBound(rule: RecurrenceRule, timeZone: string): number | null {
  if (!rule.until) return null;
  const stamp = Date.parse(rule.until);
  if (Number.isNaN(stamp)) return null;
  // A bare date means "through the end of that day", in the task's own zone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(rule.until)) {
    const [year, month, day] = rule.until.split('-').map(Number);
    return wallToInstant({ year, month, day, hour: 23, minute: 59, second: 59 }, timeZone) + 999;
  }
  return stamp;
}

/**
 * The occurrence strictly after `from`, kept on the zone's wall clock so a task
 * due at 09:00 stays at 09:00 across month ends and daylight-saving changes.
 */
export function nextOccurrence(
  raw: string | null | undefined,
  from: Date,
  timeZone = 'UTC',
): Date | null {
  const rule = parseRecurrence(raw);
  if (!rule) return null;

  const base = wallOf(from, timeZone);
  const step = rule.interval ?? 1;
  let candidate: WallClock | null = null;

  if (rule.freq === 'daily') {
    candidate = addDays(base, step);
  } else if (rule.freq === 'weekly') {
    const wanted = rule.days?.length ? new Set(rule.days) : new Set([weekdayOf(base, timeZone)]);
    // "Every N weeks" skips whole weeks: with N=2 the next hit is in week 2, not this week.
    const first = (step - 1) * 7 + 1;
    for (let offset = first; offset <= first + 6; offset += 1) {
      const probe = addDays(base, offset);
      if (wanted.has(weekdayOf(probe, timeZone))) {
        candidate = probe;
        break;
      }
    }
  } else if (rule.freq === 'monthly') {
    const wanted = rule.byMonthDay ?? base.day;
    for (let index = 1; index <= 24; index += 1) {
      const probe = addMonths(base, index * step);
      probe.day = clampDay(probe.year, probe.month, wanted);
      const instant = wallToInstant(probe, timeZone);
      if (instant > from.getTime()) {
        candidate = probe;
        break;
      }
    }
  } else {
    for (let index = 1; index <= 4; index += 1) {
      const probe = { ...base, year: base.year + index * step };
      probe.day = clampDay(probe.year, probe.month, probe.day);
      if (wallToInstant(probe, timeZone) > from.getTime()) {
        candidate = probe;
        break;
      }
    }
  }

  if (!candidate) return null;
  const instant = wallToInstant(candidate, timeZone);
  if (instant <= from.getTime()) return null;

  const bound = untilBound(rule, timeZone);
  if (bound !== null && instant > bound) return null;

  return new Date(instant);
}

function weekdayOf(wall: WallClock, timeZone: string): number {
  return new Date(wallToInstant(wall, timeZone)).getUTCDay();
}

function addDays(wall: WallClock, days: number): WallClock {
  const date = new Date(Date.UTC(wall.year, wall.month - 1, wall.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: wall.hour,
    minute: wall.minute,
    second: wall.second,
  };
}

function addMonths(wall: WallClock, months: number): WallClock {
  const total = wall.month - 1 + months;
  return {
    year: wall.year + Math.floor(total / 12),
    month: (total % 12) + 1,
    day: wall.day,
    hour: wall.hour,
    minute: wall.minute,
    second: wall.second,
  };
}
