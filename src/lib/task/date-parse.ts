/**
 * G332/G333: the date box parses in two tiers — strict calendar formats first, then a small
 * natural-language layer — and only adopts a result that is today or later. Past dates are
 * rejected silently (G369): no preview, no error, no write.
 */

export type ParseResult =
  | { ok: true; date: Date }
  | { ok: false; reason: 'empty' | 'unparsed' };

const WEEKDAY_INDEX: Record<string, number> = {
  日: 0,
  天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

const RELATIVE_DAYS: Record<string, number> = {
  今天: 0,
  今日: 0,
  明天: 1,
  明日: 1,
  后天: 2,
  大后天: 3,
  today: 0,
  tomorrow: 1,
};

export function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

/** Strictly before today's midnight. */
export function isPastLocalDay(date: Date, now: Date = new Date()): boolean {
  return startOfLocalDay(date).getTime() < startOfLocalDay(now).getTime();
}

function addDays(date: Date, days: number): Date {
  const copy = startOfLocalDay(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Monday-based week offset: Monday 0 … Sunday 6. */
function mondayOffset(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function ok(date: Date): ParseResult {
  return { ok: true, date: startOfLocalDay(date) };
}

export function parseDateExpression(input: string, now: Date = new Date()): ParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: 'empty' };
  const lower = raw.toLowerCase();

  // Tier 1 — strict calendar formats. `.` and `/` are accepted as separators, and the parts
  // must form a real date (2026-02-30 is rejected rather than rolling into March).
  const strict = raw.replace(/[./]/g, '-');
  const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(strict);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return { ok: false, reason: 'unparsed' };
    }
    return ok(date);
  }

  // Tier 2 — relative phrases.
  if (lower in RELATIVE_DAYS) return ok(addDays(now, RELATIVE_DAYS[lower]));

  const weekday = /^(下|这|本)?(?:周|星期|礼拜)([一二三四五六日天])$/.exec(raw);
  if (weekday) {
    const target = WEEKDAY_INDEX[weekday[2]];
    const prefix = weekday[1];
    if (prefix === '下') {
      const toNextMonday = 7 - mondayOffset(now);
      return ok(addDays(now, toNextMonday + ((target + 6) % 7)));
    }
    if (prefix === '这' || prefix === '本') {
      return ok(addDays(now, (target + 6) % 7 - mondayOffset(now)));
    }
    // Bare 「周五」: the next such weekday strictly after today.
    const delta = ((target + 6) % 7 - mondayOffset(now) + 7) % 7 || 7;
    return ok(addDays(now, delta));
  }

  const inDays = /^(\d+)\s*天(?:后|以后)$/.exec(raw);
  if (inDays) return ok(addDays(now, Number(inDays[1])));

  const monthDay = /^(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]$/.exec(raw);
  if (monthDay) {
    const month = Number(monthDay[1]);
    const day = Number(monthDay[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return { ok: false, reason: 'unparsed' };
    const date = new Date(now.getFullYear(), month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) return { ok: false, reason: 'unparsed' };
    return ok(date);
  }

  return { ok: false, reason: 'unparsed' };
}

export type Adoption =
  | { action: 'clear'; value: null }
  | { action: 'ignore' }
  | { action: 'skip'; value: string }
  | { action: 'commit'; value: string };

/**
 * G333: the write guard. Empty clears the field; an unparsed or past date is dropped without
 * feedback; an unchanged day skips the write; everything else commits as local midnight.
 */
export function adoptDateExpression(
  input: string,
  current: string | null,
  now: Date = new Date(),
): Adoption {
  const parsed = parseDateExpression(input, now);
  if (!parsed.ok) {
    if (parsed.reason === 'empty') return { action: 'clear', value: null };
    return { action: 'ignore' };
  }
  if (isPastLocalDay(parsed.date, now)) return { action: 'ignore' };

  const value = parsed.date.toISOString();
  if (current) {
    const existing = new Date(current);
    if (!Number.isNaN(existing.getTime()) && isSameLocalDay(existing, parsed.date)) {
      return { action: 'skip', value: current };
    }
  }
  return { action: 'commit', value };
}
