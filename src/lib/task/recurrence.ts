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
    if (!Array.isArray(rule.days) || !rule.days.every((day) => isWeekdayNumber(day))) return null;
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

function isWeekdayNumber(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6;
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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
