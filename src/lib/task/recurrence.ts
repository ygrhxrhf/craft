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
  /**
   * Weekly: 0 = Sunday through 6 = Saturday.
   * G406: monthly reuses the same `days` key for **day numbers** (1–31) — the official model
   * keeps `days: number[]` on monthly too, and `freq` is what disambiguates.
   */
  days?: number[];
  /** Monthly: 1 to 31, clamped to the length of the target month. */
  byMonthDay?: number;
  /**
   * G406: relative days. `{type:'day', selector:'last'}` = 月末；`{type:'friday', selector:'last'}`
   * = 最后一个周五；`selector` 还可以是 `first` 或 1–5（第 N 个）。
   */
  dynamicDays?: DynamicDay[];
  /** G547: daily/monthly only — skip Saturday and Sunday occurrences. Absent means no. */
  skipWeekends?: boolean;
  /**
   * G664: the sequence's creation day (`YYYY-MM-DD`). It never advances when an occurrence is
   * completed — only `scheduleDate` moves forward.
   */
  startDate?: string;
  /** Inclusive upper bound, ISO date or datetime. */
  until?: string;
}

export type DynamicDaySelector = 'first' | 'last' | number;

export interface DynamicDay {
  /** `day`（日号）或英文星期名（`monday`…`sunday`，小写）。 */
  type: string;
  selector: DynamicDaySelector;
}

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** G406：`dynamicDays` 的形状校验——只认 `day`／星期名 与 first/last/1–5。 */
function isDynamicDay(value: unknown): value is DynamicDay {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.type !== 'string') return false;
  if (entry.type !== 'day' && !WEEKDAY_NAMES.includes(entry.type as (typeof WEEKDAY_NAMES)[number])) return false;
  const selector = entry.selector;
  if (selector === 'first' || selector === 'last') return true;
  return Number.isInteger(selector) && (selector as number) >= 1 && (selector as number) <= 5;
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
    // G406：monthly 的 `days` 是**日号**（多日号），只留 1–31 的整数。
    if (rule.freq === 'monthly') {
      const rawDays = rule.days as unknown[];
      const days = (rawDays as unknown[]).filter(
        (value): value is number => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 31,
      );
      if (days.length === 0 && rawDays.length > 0) return null;
      rule.days = days;
    }
  }
  if (rule.dynamicDays !== undefined) {
    if (!Array.isArray(rule.dynamicDays)) return null;
    const dynamicDays = rule.dynamicDays.filter(isDynamicDay);
    if (dynamicDays.length === 0 && rule.dynamicDays.length > 0) return null;
    rule.dynamicDays = dynamicDays;
  }
  if (rule.byMonthDay !== undefined && !(Number.isInteger(rule.byMonthDay) && (rule.byMonthDay as number) >= 1 && (rule.byMonthDay as number) <= 31)) {
    return null;
  }
  if (rule.until !== undefined && typeof rule.until !== 'string') return null;
  if (rule.startDate !== undefined && typeof rule.startDate !== 'string') return null;
  if (rule.skipWeekends !== undefined && typeof rule.skipWeekends !== 'boolean') return null;
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
  if (Array.isArray(rule.dynamicDays)) result.dynamicDays = rule.dynamicDays as DynamicDay[];
  if (rule.byMonthDay !== undefined) result.byMonthDay = rule.byMonthDay as number;
  if (typeof rule.until === 'string') result.until = rule.until;
  if (typeof rule.startDate === 'string') result.startDate = rule.startDate;
  // G547: the field only exists on daily/monthly; anywhere else it is dropped ("有才写").
  if (rule.skipWeekends === true && (rule.freq === 'daily' || rule.freq === 'monthly')) {
    result.skipWeekends = true;
  }
  return result;
}

/**
 * G652 —— 官方不允许"有重复但无排期"的中间态：设置重复且排期为空时，同一次 patch 把排期写成
 * 今天零点（客户端本地日）。`recurrence` 为 null 时排期原样保留（`repeat==null || schedule!=null
 * ? schedule : today`）。
 */
export function scheduleWithRecurrence(
  recurrence: string | null | undefined,
  scheduleDate: string | null | undefined,
  today: Date,
): string | null {
  if (recurrence == null) return scheduleDate ?? null;
  if (scheduleDate != null) return scheduleDate;
  const local = new Date(today);
  local.setHours(0, 0, 0, 0);
  return local.toISOString();
}

/** G664: the local calendar day as `YYYY-MM-DD`. */
export function localDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** G405：官方星期名（小写、全名）。 */export const OFFICIAL_WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

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
  if (rule.freq === 'monthly') {
    const parts: string[] = [];
    if (rule.days?.length) {
      parts.push(`${rule.days.slice().sort((a, b) => a - b).join(' 日、')} 日`);
    } else if (rule.byMonthDay) {
      parts.push(`${rule.byMonthDay} 日`);
    }
    for (const entry of rule.dynamicDays ?? []) parts.push(dynamicDayLabel(entry));
    if (parts.length) return `${every} ${parts.join('、')}重复${anchor}`;
  }
  return `${every}重复${anchor}`;
}

/** G406：相对日的人话（`月末` / `第一个周五` / `第 3 个周三` / `第 15 日`）。 */
export function dynamicDayLabel(entry: DynamicDay): string {
  if (entry.type === 'day') {
    if (entry.selector === 'last') return '月末';
    if (entry.selector === 'first') return '月初';
    return `第 ${entry.selector} 日`;
  }
  const weekday = `${WEEKDAY_LABELS[WEEKDAY_NAMES.indexOf(entry.type as (typeof WEEKDAY_NAMES)[number])] ?? ''}`;
  if (entry.selector === 'last') return `最后一个${weekday}`;
  if (entry.selector === 'first') return `第一个${weekday}`;
  return `第 ${entry.selector} 个${weekday}`;
}

/** The preset rules the task scheduler offers; the value is the stored JSON text. */
export const RECURRENCE_PRESETS: { label: string; value: string | null }[] = [
  { label: '不重复', value: null },
  { label: '每天', value: '{"freq":"daily","type":"fixed"}' },
  { label: '每周', value: '{"freq":"weekly","type":"fixed"}' },
  { label: '每月', value: '{"freq":"monthly","type":"fixed"}' },
  { label: '每年', value: '{"freq":"yearly","type":"fixed"}' },
];

/**
 * G374: the repeat sub-menu labels carry the date being scheduled —
 * 「每天」/「每个工作日（周一至周五）」/「每周 (周五)」/「每月 (9.)」/「每年 (10月9日)」.
 * Without a date the labels fall back to the plain frequency names.
 */
export function recurrencePresetsFor(
  date: Date | null,
  anchor: 'fixed' | 'flexible' = 'fixed',
): { label: string; value: string }[] {
  const startDate = localDateString(date ?? new Date());
  const weekday = date ? (date.getDay() + 6) % 7 : null; // Monday = 0
  const monthDay = date ? date.getDate() : null;
  const month = date ? date.getMonth() + 1 : null;
  const weekdayLabel = weekday === null ? null : '一二三四五六日'[weekday];

  return [
    { label: '每天', value: JSON.stringify({ freq: 'daily', type: anchor, startDate }) },
    {
      label: '每个工作日（周一至周五）',
      value: JSON.stringify({ freq: 'weekly', type: anchor, days: serializeWeekdays([1, 2, 3, 4, 5]), startDate }),
    },
    {
      label: weekdayLabel ? `每周 (周${weekdayLabel})` : '每周',
      value: JSON.stringify(
        weekday === null
          ? { freq: 'weekly', type: anchor, startDate }
          : { freq: 'weekly', type: anchor, days: serializeWeekdays([(weekday + 1) % 7]), startDate },
      ),
    },
    {
      label: monthDay ? `每月 (${monthDay}.)` : '每月',
      value: JSON.stringify(
        monthDay
          ? { freq: 'monthly', type: anchor, byMonthDay: monthDay, startDate }
          : { freq: 'monthly', type: anchor, startDate },
      ),
    },
    {
      label: date ? `每年 (${month}月${monthDay}日)` : '每年',
      value: JSON.stringify({ freq: 'yearly', type: anchor, startDate }),
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

function weekdayOfDate(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * G406：把相对日解成某个月的日号。`{type:'day'}` 是日号侧（月末/月初/第 N 日），
 * 星期名侧是「第一个/最后一个/第 N 个周X」；第 5 个周X 不存在的月份回 `null`。
 */
export function resolveDynamicDay(entry: DynamicDay, year: number, month: number): number | null {
  const last = daysInMonth(year, month);
  if (entry.type === 'day') {
    if (entry.selector === 'last') return last;
    if (entry.selector === 'first') return 1;
    return clampDay(year, month, entry.selector);
  }
  const target = WEEKDAY_NAMES.indexOf(entry.type as (typeof WEEKDAY_NAMES)[number]);
  if (target < 0) return null;
  const firstWeekday = weekdayOfDate(year, month, 1);
  const firstHit = 1 + ((target - firstWeekday + 7) % 7);
  if (entry.selector === 'first') return firstHit;
  if (entry.selector === 'last') {
    return last - ((weekdayOfDate(year, month, last) - target + 7) % 7);
  }
  const nth = firstHit + (entry.selector - 1) * 7;
  return nth <= last ? nth : null;
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
    // G406：显式日号（多日）与相对日可以并存；同一月里取**严格晚于 from**的最早一天。
    // 两者都没写时才回落到"排期那天"。
    const explicit = rule.days?.length
      ? rule.days
      : rule.dynamicDays?.length
        ? []
        : [rule.byMonthDay ?? base.day];
    const dynamic = rule.dynamicDays ?? [];
    outer: for (let index = 1; index <= 36; index += 1) {
      const shifted = addMonths(base, index * step);
      const days = new Set<number>();
      for (const day of explicit) days.add(clampDay(shifted.year, shifted.month, day));
      for (const entry of dynamic) {
        const resolved = resolveDynamicDay(entry, shifted.year, shifted.month);
        if (resolved !== null) days.add(resolved);
      }
      for (const day of [...days].sort((a, b) => a - b)) {
        const probe = { ...shifted, day };
        if (wallToInstant(probe, timeZone) > from.getTime()) {
          candidate = probe;
          break outer;
        }
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
  // G547: "周末除外" — a weekend hit rolls forward to Monday.
  if (rule.skipWeekends && (rule.freq === 'daily' || rule.freq === 'monthly')) {
    candidate = skipWeekend(candidate, timeZone);
  }
  const instant = wallToInstant(candidate, timeZone);
  if (instant <= from.getTime()) return null;

  const bound = untilBound(rule, timeZone);
  if (bound !== null && instant > bound) return null;

  return new Date(instant);
}

function weekdayOf(wall: WallClock, timeZone: string): number {
  return new Date(wallToInstant(wall, timeZone)).getUTCDay();
}

/** G547: roll a Saturday/Sunday candidate forward to Monday, keeping the wall clock. */
function skipWeekend(wall: WallClock, timeZone: string): WallClock {
  let next = wall;
  for (let guard = 0; guard < 7; guard += 1) {
    const day = weekdayOf(next, timeZone);
    if (day !== 0 && day !== 6) break;
    next = addDays(next, 1);
  }
  return next;
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
