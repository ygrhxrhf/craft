import { describe, expect, it } from 'vitest';
import { MONDAY_FIRST, SUNDAY_FIRST, REPEAT_ON_DAY_KEY, REPEAT_ON_DAY_OF_MONTH_KEY, REPEAT_ON_KEY, fromMondayFirst, startOfWeekMonday, toMondayFirst, RECURRENCE_PRESETS, normalizeWeekdays, serializeWeekdays, describeRecurrence, nextOccurrence, parseRecurrence, recurrencePresetsFor, repeatOnPhrases, scheduleWithRecurrence, localDateString } from './recurrence';

const iso = (date: Date) => date.toISOString();

describe('describeRecurrence', () => {
  it('names each preset rule', () => {
    expect(describeRecurrence('{"freq":"daily"}')).toBe('每天重复');
    expect(describeRecurrence('{"freq":"weekly"}')).toBe('每周重复');
    expect(describeRecurrence('{"freq":"weekly","days":[1,4]}')).toBe('每周 于 周一、周四');
    expect(describeRecurrence('{"freq":"monthly","byMonthDay":31}')).toBe('每月 于 31 日');
    expect(describeRecurrence('{"freq":"yearly"}')).toBe('每年重复');
  });

  it('returns null without a rule', () => {
    expect(describeRecurrence(null)).toBeNull();
    expect(describeRecurrence('nonsense')).toBeNull();
  });

  it('every preset is a rule the engine accepts', () => {
    for (const preset of RECURRENCE_PRESETS) {
      if (preset.value === null) continue;
      expect(parseRecurrence(preset.value)?.freq).toBeTruthy();
      expect(nextOccurrence(preset.value, new Date('2026-03-10T09:00:00Z'))).not.toBeNull();
    }
  });
});

describe('parseRecurrence', () => {
  it('accepts a JSON rule', () => {
    expect(parseRecurrence('{"freq":"weekly","days":[1,4]}')).toEqual({ freq: 'weekly', days: [1, 4] });
  });

  it('rejects anything unusable', () => {
    expect(parseRecurrence(null)).toBeNull();
    expect(parseRecurrence('')).toBeNull();
    expect(parseRecurrence('nonsense')).toBeNull();
    expect(parseRecurrence('{"freq":"hourly"}')).toBeNull();
    expect(parseRecurrence('{"freq":"weekly","days":["mon"]}')).toBeNull();
  });

  it('tolerates a numeric string interval on read and stores the number (G410)', () => {
    expect(parseRecurrence('{"freq":"daily","interval":"3"}')).toEqual({ freq: 'daily', interval: 3 });
    expect(parseRecurrence('{"freq":"daily","interval":"0"}')).toBeNull();
    expect(parseRecurrence('{"freq":"daily","interval":"2.5"}')).toBeNull();
  });
});

describe('nextOccurrence', () => {
  it('returns null when there is no rule', () => {
    expect(nextOccurrence(null, new Date('2026-03-10T09:00:00Z'))).toBeNull();
  });

  it('advances daily keeping the wall-clock time', () => {
    expect(iso(nextOccurrence('{"freq":"daily"}', new Date('2026-03-10T09:00:00Z'))!)).toBe(
      '2026-03-11T09:00:00.000Z'
    );
  });

  it('keeps the wall-clock time of the given instant', () => {
    expect(iso(nextOccurrence('{"freq":"daily"}', new Date('2026-03-10T08:59:59Z'))!)).toBe(
      '2026-03-11T08:59:59.000Z'
    );
  });

  it('steps to the next listed weekday', () => {
    // 2026-03-10 is a Tuesday.
    const rule = '{"freq":"weekly","days":[1,4]}';
    expect(nextOccurrence(rule, new Date('2026-03-10T09:00:00Z'))!.getUTCDay()).toBe(4);
    expect(iso(nextOccurrence(rule, new Date('2026-03-12T09:00:00Z'))!)).toBe('2026-03-16T09:00:00.000Z');
  });

  it('repeats the same weekday when no days are listed', () => {
    expect(iso(nextOccurrence('{"freq":"weekly"}', new Date('2026-03-10T09:00:00Z'))!)).toBe(
      '2026-03-17T09:00:00.000Z'
    );
  });

  it('monthly keeps the day of month', () => {
    expect(iso(nextOccurrence('{"freq":"monthly"}', new Date('2026-03-10T09:00:00Z'))!)).toBe(
      '2026-04-10T09:00:00.000Z'
    );
  });

  it('clamps a day of month that the target month does not have', () => {
    const rule = '{"freq":"monthly","byMonthDay":31}';
    expect(iso(nextOccurrence(rule, new Date('2026-01-31T09:00:00Z'))!)).toBe('2026-02-28T09:00:00.000Z');
    expect(iso(nextOccurrence(rule, new Date('2024-01-31T09:00:00Z'))!)).toBe('2024-02-29T09:00:00.000Z');
  });

  it('yearly fires in the listed months and days', () => {
    const rule = '{"freq":"yearly","months":[3,9],"days":[10]}';
    expect(iso(nextOccurrence(rule, new Date('2026-03-10T09:00:00Z'))!)).toBe(
      '2026-09-10T09:00:00.000Z'
    );
    expect(iso(nextOccurrence(rule, new Date('2026-09-10T09:00:00Z'))!)).toBe(
      '2027-03-10T09:00:00.000Z'
    );
    expect(describeRecurrence(rule)).toBe('每年 于 3、9 月 的第 10 天');
  });

  it('yearly resolves a relative day inside a chosen month', () => {
    const rule = '{"freq":"yearly","months":[11],"dynamicDays":[{"type":"friday","selector":"last"}]}';
    expect(iso(nextOccurrence(rule, new Date('2026-01-01T09:00:00Z'))!)).toBe(
      '2026-11-27T09:00:00.000Z'
    );
  });

  it('yearly handles the leap day', () => {
    expect(iso(nextOccurrence('{"freq":"yearly"}', new Date('2024-02-29T09:00:00Z'))!)).toBe(
      '2025-02-28T09:00:00.000Z'
    );
    expect(iso(nextOccurrence('{"freq":"yearly"}', new Date('2025-02-28T09:00:00Z'))!)).toBe(
      '2026-02-28T09:00:00.000Z'
    );
  });

  it('stops at the until bound', () => {
    const rule = '{"freq":"daily","until":"2026-03-11T23:59:59Z"}';
    expect(iso(nextOccurrence(rule, new Date('2026-03-10T09:00:00Z'))!)).toBe('2026-03-11T09:00:00.000Z');
    expect(nextOccurrence(rule, new Date('2026-03-11T09:00:00Z'))).toBeNull();
  });

  it('respects the time zone when the due time is stored as wall clock', () => {
    // 09:00 in Shanghai is 01:00Z; the next daily occurrence must stay 09:00 local.
    const from = new Date('2026-03-10T01:00:00Z');
    const next = nextOccurrence('{"freq":"daily"}', from, 'Asia/Shanghai')!;
    expect(iso(next)).toBe('2026-03-11T01:00:00.000Z');
  });

  it('crosses a daylight-saving boundary without drifting the local time', () => {
    // 2026-03-08 is the US spring-forward date; 09:00 local stays 09:00 after it.
    const next = nextOccurrence('{"freq":"daily"}', new Date('2026-03-07T14:00:00Z'), 'America/New_York')!;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(next);
    expect(parts.find((p) => p.type === 'hour')?.value).toBe('09');
    expect(next.getUTCDate()).toBe(8);
  });
});

// G404: every N units; G256: fixed advances on the schedule, flexible on completion.
describe('interval and anchor', () => {
  it('advances daily rules by interval days', () => {
    const next = nextOccurrence('{"freq":"daily","interval":3}', new Date('2026-03-10T09:00:00Z'), 'UTC');
    expect(iso(next!)).toBe('2026-03-13T09:00:00.000Z');
  });

  it('skips whole weeks for a weekly interval', () => {
    // 2026-03-10 is a Tuesday; every 2 weeks on Monday lands on 2026-03-23.
    const next = nextOccurrence('{"freq":"weekly","days":[1],"interval":2}', new Date('2026-03-10T09:00:00Z'), 'UTC');
    expect(iso(next!)).toBe('2026-03-23T09:00:00.000Z');
  });

  it('advances monthly rules by interval months and clamps the day', () => {
    const next = nextOccurrence(
      '{"freq":"monthly","byMonthDay":31,"interval":2}',
      new Date('2026-01-31T09:00:00Z'),
      'UTC',
    );
    expect(iso(next!)).toBe('2026-03-31T09:00:00.000Z');
  });

  it('rejects an out-of-range interval', () => {
    expect(parseRecurrence('{"freq":"daily","interval":32}')).toBeNull();
    expect(parseRecurrence('{"freq":"weekly","interval":0}')).toBeNull();
    expect(parseRecurrence('{"freq":"daily","interval":31}')?.interval).toBe(31);
  });

  it('keeps the anchor when present and describes it', () => {
    expect(parseRecurrence('{"freq":"daily","type":"flexible"}')?.type).toBe('flexible');
    expect(describeRecurrence('{"freq":"daily","type":"flexible"}')).toBe('1 天后');
    expect(describeRecurrence('{"freq":"weekly","days":[5],"interval":2}')).toBe('每 2 周 于 周五');
    expect(parseRecurrence('{"freq":"daily","type":"weekly"}')).toBeNull();
  });
});

// G374: the repeat sub-menu labels carry the date being scheduled.
describe('date-aware repeat presets', () => {
  it('prints the weekday and month day the date implies', () => {
    // 2026-03-10 is a Tuesday, the 10th.
    const labels = recurrencePresetsFor(new Date(2026, 2, 10)).map((preset) => preset.label);
    expect(labels).toEqual([
      '每天',
      '每个工作日（周一至周五）',
      '每周 (周二)',
      '每月 (10.)',
      '每年 (3月10日)',
    ]);
  });

  it('falls back to plain frequency names without a date', () => {
    const labels = recurrencePresetsFor(null).map((preset) => preset.label);
    expect(labels).toEqual(['每天', '每个工作日（周一至周五）', '每周', '每月', '每年']);
  });

  it('stores the weekday in the rule when a date is given', () => {
    const weekly = recurrencePresetsFor(new Date(2026, 2, 10)).find((p) => p.label.startsWith('每周'));
    // G405: the stored form is the official weekday-name array, not a number.
    // G668: the anchor is written explicitly (fixed) rather than left absent.
    expect(JSON.parse(weekly!.value)).toEqual({ freq: 'weekly', type: 'fixed', days: ['tuesday'], startDate: '2026-03-10' });
  });
});

// G653: the stored numbering is Sunday-first, the grid is Monday-first.
describe('the two week-start conventions', () => {
  it('converts an index both ways', () => {
    expect(toMondayFirst(0)).toBe(6); // Sunday → last column
    expect(toMondayFirst(1)).toBe(0); // Monday → first column
    expect(fromMondayFirst(0)).toBe(1);
    expect(fromMondayFirst(6)).toBe(0);
    expect(fromMondayFirst(toMondayFirst(4))).toBe(4);
  });

  it('names the two orders', () => {
    expect(SUNDAY_FIRST[0]).toBe('sunday');
    expect(MONDAY_FIRST[0]).toBe('monday');
    expect(MONDAY_FIRST[6]).toBe('sunday');
  });

  it('finds the Monday that opens a week', () => {
    // 2026-03-10 is a Tuesday → the Monday is the 9th.
    expect(startOfWeekMonday(new Date(2026, 2, 10)).getDate()).toBe(9);
    // A Monday is its own week start.
    expect(startOfWeekMonday(new Date(2026, 2, 9)).getDate()).toBe(9);
    // Sunday belongs to the week that started six days earlier.
    expect(startOfWeekMonday(new Date(2026, 2, 15)).getDate()).toBe(9);
  });
});

// G405 —— 官方 weekly.days 是星期名小写全字符串数组；读侧按 typeof === "string" 过滤。
describe('weekly.days 的官方形（G405）', () => {
  it('maps lowercase weekday names onto 0–6', () => {
    expect(normalizeWeekdays(['monday', 'thursday'])).toEqual([1, 4]);
    expect(normalizeWeekdays(['sunday'])).toEqual([0]);
  });

  it('keeps numeric values (local write shape) and sorts + dedupes', () => {
    expect(normalizeWeekdays([4, 1, 4])).toEqual([1, 4]);
  });

  it('silently drops elements that are neither a known name nor a number', () => {
    expect(normalizeWeekdays(['monday', 'funday', {}, null, 3])).toEqual([1, 3]);
  });

  it('parseRecurrence accepts a name array and yields numbers', () => {
    expect(parseRecurrence('{"freq":"weekly","days":["monday","friday"]}')?.days).toEqual([1, 5]);
  });

  it('parseRecurrence rejects an all-invalid days array', () => {
    expect(parseRecurrence('{"freq":"weekly","days":["funday"]}')).toBeNull();
  });

  it('writes the official name array back', () => {
    expect(serializeWeekdays([1, 5])).toEqual(['monday', 'friday']);
    expect(serializeWeekdays([0, 0])).toEqual(['sunday']);
  });

  it('does not apply weekday normalisation to yearly days (those are day-of-month)', () => {
    // G646 的 yearly 把日号放在 `days`：15 不是星期，不能被丢成空数组。
    expect(parseRecurrence('{"freq":"yearly","days":[15],"months":[3]}')?.days).toEqual([15]);
  });
});

// G547 —— 「跳过周末」只在 daily／monthly 的字段集里；命中周末就顺延到周一。
describe('skipWeekends (G547)', () => {
  it('reads the flag only on daily and monthly', () => {
    expect(parseRecurrence('{"freq":"daily","skipWeekends":true}')?.skipWeekends).toBe(true);
    expect(parseRecurrence('{"freq":"monthly","skipWeekends":true}')?.skipWeekends).toBe(true);
    expect(parseRecurrence('{"freq":"weekly","skipWeekends":true}')?.skipWeekends).toBeUndefined();
    expect(parseRecurrence('{"freq":"yearly","skipWeekends":true}')?.skipWeekends).toBeUndefined();
    expect(parseRecurrence('{"freq":"daily","skipWeekends":"yes"}')).toBeNull();
  });

  it('rolls a weekend daily hit to Monday', () => {
    // Friday 2026-03-06 09:00 UTC; the plain next hit is Saturday, the skipping one is Monday.
    const from = new Date('2026-03-06T09:00:00Z');
    expect(iso(nextOccurrence('{"freq":"daily"}', from, 'UTC')!)).toBe('2026-03-07T09:00:00.000Z');
    expect(iso(nextOccurrence('{"freq":"daily","skipWeekends":true}', from, 'UTC')!)).toBe(
      '2026-03-09T09:00:00.000Z'
    );
  });

  it('rolls a weekend monthly hit to Monday', () => {
    // From 1 March the next monthly hit is 4 April 2026, a Saturday.
    const from = new Date('2026-03-01T09:00:00Z');
    expect(iso(nextOccurrence('{"freq":"monthly","byMonthDay":4}', from, 'UTC')!)).toBe(
      '2026-04-04T09:00:00.000Z'
    );
    expect(iso(nextOccurrence('{"freq":"monthly","byMonthDay":4,"skipWeekends":true}', from, 'UTC')!)).toBe(
      '2026-04-06T09:00:00.000Z'
    );
  });
});

// G652 —— 有重复就不能没有排期：同一次 patch 补今天零点。
describe('scheduleWithRecurrence (G652)', () => {
  const today = new Date(2026, 10, 2, 15, 30); // local 2026-11-02

  it('fills today local midnight when a repeat has no schedule', () => {
    const filled = scheduleWithRecurrence('{"freq":"daily"}', null, today);
    const parsed = new Date(filled!);
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate()]).toEqual([2026, 10, 2]);
    expect([parsed.getHours(), parsed.getMinutes(), parsed.getSeconds()]).toEqual([0, 0, 0]);
  });

  it('keeps an existing schedule and leaves a null repeat alone', () => {
    expect(scheduleWithRecurrence('{"freq":"daily"}', '2026-12-01T00:00:00.000Z', today)).toBe(
      '2026-12-01T00:00:00.000Z'
    );
    expect(scheduleWithRecurrence(null, null, today)).toBeNull();
    expect(scheduleWithRecurrence(null, '2026-12-01T00:00:00.000Z', today)).toBe(
      '2026-12-01T00:00:00.000Z'
    );
  });
});

// G668 —— 写侧的规则带显式锚，默认 fixed。
describe('explicit anchor on write (G668)', () => {
  it('every preset carries type fixed', () => {
    for (const preset of recurrencePresetsFor(new Date(2026, 2, 10)).slice(1)) {
      expect(JSON.parse(preset.value).type).toBe('fixed');
    }
  });

  // G265: the anchor is a level above the frequency, so presets carry whichever anchor was chosen.
  it('carries the chosen anchor into every preset', () => {
    for (const preset of recurrencePresetsFor(new Date(2026, 2, 10), 'flexible').slice(1)) {
      expect(JSON.parse(preset.value).type).toBe('flexible');
    }
  });
});

// G664: the repeat carries its creation day; completing an occurrence only moves scheduleDate.
describe('repeat.startDate (G664)', () => {
  it('keeps startDate through parse/serialize', () => {
    const rule = parseRecurrence('{"freq":"weekly","startDate":"2026-09-28","days":["monday"]}');
    expect(rule?.startDate).toBe('2026-09-28');
  });

  it('writes the local day when the rule is created', () => {
    expect(localDateString(new Date(2026, 8, 28))).toBe('2026-09-28');
  });
});

// G406: monthly takes a **day list** and **relative days**, not just one clamped day.
describe('monthly multi-day and relative days (G406)', () => {
  const rule = (value: unknown) => JSON.stringify(value);

  it('parses a day list and rejects out-of-range entries', () => {
    expect(parseRecurrence(rule({ freq: 'monthly', days: [3, 15] }))?.days).toEqual([3, 15]);
    expect(parseRecurrence(rule({ freq: 'monthly', days: [0, 32] }))).toBeNull();
    expect(parseRecurrence(rule({ freq: 'monthly', days: [3, 40] }))?.days).toEqual([3]);
  });

  it('parses last-day and last-weekday selectors, rejecting unknown ones', () => {
    const parsed = parseRecurrence(
      rule({ freq: 'monthly', dynamicDays: [{ type: 'day', selector: 'last' }, { type: 'friday', selector: 'last' }] }),
    );
    expect(parsed?.dynamicDays).toHaveLength(2);
    expect(parseRecurrence(rule({ freq: 'monthly', dynamicDays: [{ type: 'blursday', selector: 'last' }] }))).toBeNull();
    expect(parseRecurrence(rule({ freq: 'monthly', dynamicDays: [{ type: 'friday', selector: 9 }] }))).toBeNull();
  });

  it('advances through the earliest listed day', () => {
    const raw = rule({ freq: 'monthly', days: [3, 15] });
    // 本地既有口径：monthly 的下一发落在**下一个月**（与 byMonthDay 的老行为一致）。
    const from10 = new Date('2026-01-10T09:00:00Z');
    expect(nextOccurrence(raw, from10)?.toISOString().slice(0, 10)).toBe('2026-02-03');
    const fromFeb = new Date('2026-02-03T09:00:00Z');
    expect(nextOccurrence(raw, fromFeb)?.toISOString().slice(0, 10)).toBe('2026-03-03');
  });

  it('resolves month end and the last Friday', () => {
    const monthEnd = rule({ freq: 'monthly', dynamicDays: [{ type: 'day', selector: 'last' }] });
    expect(nextOccurrence(monthEnd, new Date('2026-01-31T09:00:00Z'))?.toISOString().slice(0, 10)).toBe('2026-02-28');
    const lastFriday = rule({ freq: 'monthly', dynamicDays: [{ type: 'friday', selector: 'last' }] });
    expect(nextOccurrence(lastFriday, new Date('2026-01-01T09:00:00Z'))?.toISOString().slice(0, 10)).toBe('2026-02-27');
  });

  it('skips months without a fifth weekday', () => {
    const fifthWednesday = rule({ freq: 'monthly', dynamicDays: [{ type: 'wednesday', selector: 5 }] });
    expect(nextOccurrence(fifthWednesday, new Date('2026-01-01T09:00:00Z'))?.toISOString().slice(0, 10)).toBe(
      '2026-04-29',
    );
  });

  it('describes the rule in the official phrasing shape', () => {
    expect(describeRecurrence(rule({ freq: 'monthly', days: [3, 15] }))).toBe('每月 于 3、15 日');
    expect(describeRecurrence(rule({ freq: 'monthly', dynamicDays: [{ type: 'day', selector: 'last' }] }))).toBe(
      '每月 于 月末',
    );
    expect(describeRecurrence(rule({ freq: 'monthly', dynamicDays: [{ type: 'friday', selector: 'last' }] }))).toBe(
      '每月 于 最后一个周五',
    );
  });
});

// G257 —— 频率文案的三档官方模板（`feature-catalog.md` 的 `tasks.0.on.*` 三键）。
describe('the three 「on …」 templates (G257)', () => {
  it('keeps the catalog keys verbatim', () => {
    expect(REPEAT_ON_KEY).toBe('tasks.0.on.1');
    expect(REPEAT_ON_DAY_KEY).toBe('tasks.0.on.the.1.day');
    expect(REPEAT_ON_DAY_OF_MONTH_KEY).toBe('tasks.0.on.the.1.day.of.2');
  });

  it('renders a weekday rule through 「[0] 于 [1]」', () => {
    expect(repeatOnPhrases('{"freq":"weekly","days":[1,4]}')).toEqual([
      { key: REPEAT_ON_KEY, args: ['每周', '周一、周四'], text: '每周 于 周一、周四' },
    ]);
  });

  it('renders a day-of-month rule through 「[0] 于 [1] 日」', () => {
    const [phrase] = repeatOnPhrases('{"freq":"monthly","days":[3,15]}');
    expect(phrase.key).toBe(REPEAT_ON_DAY_KEY);
    expect(phrase.text).toBe('每月 于 3、15 日');
  });

  it('renders the Nth day of a named month through 「[0] 于 [2] 的第 [1] 天」', () => {
    const [phrase] = repeatOnPhrases('{"freq":"yearly","months":[9],"days":[28]}');
    expect(phrase.key).toBe(REPEAT_ON_DAY_OF_MONTH_KEY);
    expect(phrase.args).toEqual(['每年', '28', '9 月']);
    expect(phrase.text).toBe('每年 于 9 月 的第 28 天');
  });

  it('carries the interval into slot [0]', () => {
    expect(repeatOnPhrases('{"freq":"weekly","interval":2,"days":[5]}')[0].text).toBe('每 2 周 于 周五');
  });

  it('has no on-phrase for daily rules', () => {
    expect(repeatOnPhrases('{"freq":"daily"}')).toEqual([]);
    expect(describeRecurrence('{"freq":"daily","skipWeekends":true}')).toBe('每天重复（跳过周末）');
  });
});

// G637/G663 —— 两档锚点在屏外的实测差：同一天完成，fixed 走原序列，flexible 加一个 interval。
describe('the two anchors land differently (G637/G663)', () => {
  it('fixed walks the original sequence from 2026-09-28 (a Monday)', () => {
    const next = nextOccurrence('{"freq":"weekly","type":"fixed","days":[1,3,5]}', new Date('2026-09-28T09:00:00Z'))!;
    expect(iso(next)).toBe('2026-09-30T09:00:00.000Z');
  });

  it('flexible adds the interval to the completion day (mon/fri → 2026-10-05)', () => {
    const next = nextOccurrence('{"freq":"weekly","type":"flexible","days":[1,5]}', new Date('2026-09-28T09:00:00Z'))!;
    expect(iso(next)).toBe('2026-10-05T09:00:00.000Z');
    expect(next.getUTCDay()).toBe(1);
  });

  it('flexible daily adds N days and clamps a month step', () => {
    expect(iso(nextOccurrence('{"freq":"daily","type":"flexible","interval":3}', new Date('2026-09-28T09:00:00Z'))!)).toBe(
      '2026-10-01T09:00:00.000Z',
    );
    expect(
      nextOccurrence('{"freq":"monthly","type":"flexible"}', new Date('2026-01-31T09:00:00Z'))!
        .toISOString()
        .slice(0, 10),
    ).toBe('2026-02-28');
  });
});

// G687 —— 官方 repeat JSON 是 `frequency` + 每个频率自己的子对象；读侧两种形都收。
describe('the official repeat JSON shape is read too (G687)', () => {
  const dailyOfficial =
    '{"type":"fixed","frequency":"daily","startDate":"2026-09-28","daily":{"skipWeekends":false},"reminder":{"enabled":true,"dateOffset":540}}';

  it('maps `frequency` onto `freq`', () => {
    expect(parseRecurrence(dailyOfficial)).toEqual({ freq: 'daily', type: 'fixed', startDate: '2026-09-28' });
  });

  it('lifts each frequency\'s nested axes', () => {
    expect(parseRecurrence('{"frequency":"weekly","weekly":{"days":["monday","friday"]}}')?.days).toEqual([1, 5]);
    expect(parseRecurrence('{"frequency":"monthly","monthly":{"days":[1,15]}}')?.days).toEqual([1, 15]);
    expect(parseRecurrence('{"frequency":"yearly","yearly":{"months":[9],"days":[28]}}')).toMatchObject({
      months: [9],
      days: [28],
    });
    expect(parseRecurrence('{"frequency":"daily","daily":{"skipWeekends":true}}')?.skipWeekends).toBe(true);
  });

  it('treats `interval: null` as unset', () => {
    expect(parseRecurrence('{"frequency":"weekly","interval":null}')?.interval).toBeUndefined();
  });

  it('describes an official-shaped rule through the same templates', () => {
    expect(describeRecurrence('{"frequency":"weekly","weekly":{"days":["monday"]}}')).toBe('每周 于 周一');
  });
});
