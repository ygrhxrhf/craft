import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  TIMELINE_DAY_RUN,
  addDays,
  dayDiff,
  dayInSection,
  dateLabel,
  monthLabel,
  relativeDayLabel,
  sectionActionDate,
  timelineSections,
  sectionSpan,
  weekdayLabel,
  type TimelineSection,
} from './timeline';

/** The day `dom-route-calendar.html` was captured on: 2026-09-27, a Sunday. */
const CAPTURE_DAY = new Date(2026, 8, 27);

/** The header the official DOM shows for a day section: `9月27日 • 今天 • 星期日`. */
function header(section: TimelineSection): string {
  if (section.kind === 'range') return `${dateLabel(section.start)} / ${dateLabel(section.end)}`;
  if (section.kind === 'month' || section.kind === 'later') return section.label;
  return [dateLabel(section.date), section.relative, weekdayLabel(section.date)]
    .filter(Boolean)
    .join(' • ');
}

describe('the captured timeline', () => {
  const sections = timelineSections({ anchor: CAPTURE_DAY, today: CAPTURE_DAY });

  it('lists seven consecutive days from the anchor, then collapses the month', () => {
    expect(sections.map(header)).toEqual([
      '9月27日 • 今天 • 星期日',
      '9月28日 • 明天 • 星期一',
      '9月29日 • 星期二',
      '9月30日 • 星期三',
      '10月1日 • 星期四',
      '10月2日 • 星期五',
      '10月3日 • 星期六',
      '10月4日 / 10月31日',
      '十一月',
    ]);
    expect(sections.filter((section) => section.kind === 'day')).toHaveLength(TIMELINE_DAY_RUN);
  });

  it('only labels 今天 and 明天 relatively', () => {
    const labels = sections.map((section) =>
      section.kind === 'day' ? section.relative : null
    );
    expect(labels).toEqual(['今天', '明天', null, null, null, null, null, null, null]);
  });

  it('acts on the first day of a collapsed section, the way the captured links do', () => {
    // 采集里那两节的 `创建每日笔记` 链接分别是 2026.10.04 与 2026.11.01。
    const [, , , , , , , range, month] = sections;
    expect(sectionActionDate(range).toDateString()).toBe(new Date(2026, 9, 4).toDateString());
    expect(sectionActionDate(month).toDateString()).toBe(new Date(2026, 10, 1).toDateString());
  });

  it('covers every day exactly once', () => {
    const covered = sections.flatMap((section) => {
      const days: string[] = [];
      for (let cursor = sectionActionDate(section); dayInSection(section, cursor); cursor = addDays(cursor, 1)) {
        days.push(cursor.toDateString());
      }
      return days;
    });
    expect(new Set(covered).size).toBe(covered.length);
  });

  it('sends a task due inside the collapsed month to the range section', () => {
    const [, , , , , , , range] = sections;
    expect(dayInSection(range, new Date(2026, 9, 20))).toBe(true);
    expect(sections.some((s) => s !== range && dayInSection(s, new Date(2026, 9, 20)))).toBe(false);
  });
});

describe('growing the timeline', () => {
  it('reveals earlier days ahead of the anchor', () => {
    const headers = timelineSections({ anchor: CAPTURE_DAY, today: CAPTURE_DAY, earlierDays: 3 }).map(
      (section) => header(section)
    );
    expect(headers.slice(0, 4)).toEqual([
      '9月24日 • 星期四',
      '9月25日 • 星期五',
      '9月26日 • 星期六',
      '9月27日 • 今天 • 星期日',
    ]);
  });

  it('appends one month per press of 显示下个月', () => {
    const one = timelineSections({ anchor: CAPTURE_DAY, today: CAPTURE_DAY }).map(header);
    const two = timelineSections({ anchor: CAPTURE_DAY, today: CAPTURE_DAY, laterMonths: 1 }).map(
      (section) => header(section)
    );
    expect(one.at(-1)).toBe('十一月');
    expect(two.slice(-2)).toEqual(['十一月', '十二月']);
  });
});

describe('an anchor that runs past the end of its month', () => {
  const anchor = new Date(2026, 9, 29);

  it('does not collapse a month it already listed day by day', () => {
    const sections = timelineSections({ anchor, today: anchor });
    expect(sections.slice(0, TIMELINE_DAY_RUN).map(header)).toEqual([
      '10月29日 • 今天 • 星期四',
      '10月30日 • 明天 • 星期五',
      '10月31日 • 星期六',
      '11月1日 • 星期日',
      '11月2日 • 星期一',
      '11月3日 • 星期二',
      '11月4日 • 星期三',
    ]);
    expect(sections.slice(TIMELINE_DAY_RUN).map(header)).toEqual(['11月5日 / 11月30日', '十二月']);
  });

  it('names a January month section 一月', () => {
    const sections = timelineSections({ anchor: new Date(2026, 11, 30), today: new Date(2026, 11, 30) });
    expect(monthLabel(new Date(2027, 0, 1))).toBe('一月');
    expect(sections.at(-1)?.kind).toBe('month');
  });

  it('labels a day by its distance from today rather than the anchor', () => {
    // 锚点可以是用户翻到的别的日子；「今天」仍然只属于真正的今天。
    const sections = timelineSections({ anchor: new Date(2026, 9, 21), today: new Date(2026, 9, 27) });
    expect(sections.filter((s) => s.kind === 'day').map((s) => (s.kind === 'day' ? s.relative : null))).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      '今天',
    ]);
    expect(relativeDayLabel(new Date(2026, 9, 28), new Date(2026, 9, 27))).toBe('明天');
    expect(relativeDayLabel(new Date(2026, 9, 26), new Date(2026, 9, 27))).toBeNull();
  });

  it('calculates dayDiff with floor convention matching official Kq (G661)', () => {
    const base = new Date(2026, 8, 27, 12, 0, 0);
    const tomorrow = new Date(2026, 8, 28, 18, 0, 0);
    const yesterday = new Date(2026, 8, 26, 6, 0, 0);
    expect(dayDiff(base, base)).toBe(0);
    expect(dayDiff(tomorrow, base)).toBe(1);
    expect(dayDiff(yesterday, base)).toBe(-1);
  });
});

describe('the later section (G96)', () => {
  it('covers everything after the loaded months', () => {
    const day = new Date(2027, 0, 5);
    const section = { kind: 'later' as const, key: 'later', start: new Date(2026, 11, 1), label: '之后' };
    expect(sectionSpan(section).start).toEqual(new Date(2026, 11, 1));
    expect(dayInSection(section, day)).toBe(true);
    expect(dayInSection(section, new Date(2026, 10, 30))).toBe(false);
  });

  it('is rendered by the timeline only when far-future tasks exist', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/calendar/CalendarTimeline.tsx'),
      'utf8',
    );
    expect(source).toContain('hasLaterTasks &&');
    expect(source).toContain('LATER_TITLE');
    expect(source).toContain('calendar-section-${section.kind}');
  });
});
