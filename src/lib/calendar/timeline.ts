/**
 * 日历纵向时间轴的成节规则（G43）。逐字依据 `_harvest/dom-route-calendar.html`（采集日 9 月 27 日＝星期日）：
 * 从锚点日往后连续七天逐日成节（`9月27日 • 今天 • 星期日` 一直到 `10月3日 • 星期六`），七天用完后
 * 本月余日并成一节（表头两行 `10月4日` / `10月31日`），再往后每个月各并成一节（`十一月`）；
 * `↑ 显示前几天` 把锚点往前逐日补出来，`↓ 显示下个月` 每次多并一个月。每一节都带 `添加任务`
 * 与 `创建每日笔记`。
 */

/** 官方逐日成节的天数：采集里 9月27日…10月3日 恰好七节，之后才是并节。 */
export const TIMELINE_DAY_RUN = 7;

export type TimelineDaySection = {
  kind: 'day';
  key: string;
  date: Date;
  /** 只有 今天／明天 两档——采集里其余日子都只写「日期 • 星期」。 */
  relative: string | null;
  weekday: string;
};

export type TimelineRangeSection = {
  kind: 'range';
  key: string;
  start: Date;
  end: Date;
};

export type TimelineMonthSection = {
  kind: 'month';
  key: string;
  /** 该月第一天，`创建每日笔记` 落在它上面（采集里 `十一月` 那节的链接是 `2026.11.01`）。 */
  date: Date;
  label: string;
};

export type TimelineSection = TimelineDaySection | TimelineRangeSection | TimelineMonthSection;

const CHINESE_MONTH_NUMBERS = [
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
  '十',
  '十一',
  '十二',
];

export function startOfDay(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate());
}

export function addDays(day: Date, count: number): Date {
  const next = startOfDay(day);
  next.setDate(next.getDate() + count);
  return next;
}

export function endOfMonth(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth() + 1, 0);
}

/** Whole days from `today` to `day`, negative for earlier days. */
export function dayDiff(day: Date, today: Date): number {
  return Math.round((startOfDay(day).getTime() - startOfDay(today).getTime()) / 86_400_000);
}

export function relativeDayLabel(day: Date, today: Date): string | null {
  const diff = dayDiff(day, today);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  return null;
}

export function weekdayLabel(day: Date): string {
  return day.toLocaleDateString('zh-CN', { weekday: 'long' });
}

/** `十一月`＝中文序数月名；采集里并节用名而不用「11月」。 */
export function monthLabel(day: Date): string {
  return `${CHINESE_MONTH_NUMBERS[day.getMonth()]}月`;
}

/** `9月27日`＝日期用阿拉伯数字，与并节的中文月名不同源。 */
export function dateLabel(day: Date): string {
  return `${day.getMonth() + 1}月${day.getDate()}日`;
}

export function timelineSections(options: {
  anchor: Date;
  today: Date;
  /** `↑ 显示前几天` 已经展开了几天。 */
  earlierDays?: number;
  /** `↓ 显示下个月` 已经追加了几个月；默认仍并一个月，与采集一致。 */
  laterMonths?: number;
}): TimelineSection[] {
  const { anchor, today } = options;
  const earlierDays = options.earlierDays ?? 0;
  const laterMonths = options.laterMonths ?? 0;

  const sections: TimelineSection[] = [];
  const start = addDays(anchor, -earlierDays);
  for (let offset = 0; offset < earlierDays; offset++) {
    sections.push(daySection(addDays(start, offset), today));
  }
  for (let offset = 0; offset < TIMELINE_DAY_RUN; offset++) {
    sections.push(daySection(addDays(anchor, offset), today));
  }

  const runEnd = addDays(anchor, TIMELINE_DAY_RUN - 1);
  const monthEnd = endOfMonth(runEnd);
  if (dayDiff(monthEnd, runEnd) > 0) {
    const rangeStart = addDays(runEnd, 1);
    sections.push({
      kind: 'range',
      key: `range:${rangeStart.toDateString()}`,
      start: rangeStart,
      end: monthEnd,
    });
  }

  // 并月从「七天的最后一天所在月」的下一个月开始，跨月的那一跑不会把已列出的日子再并进去。
  const firstMonth = new Date(runEnd.getFullYear(), runEnd.getMonth() + 1, 1);
  for (let offset = 0; offset <= laterMonths; offset++) {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + offset, 1);
    sections.push({ kind: 'month', key: `month:${date.getFullYear()}-${date.getMonth()}`, date, label: monthLabel(date) });
  }

  return sections;
}

function daySection(date: Date, today: Date): TimelineDaySection {
  return {
    kind: 'day',
    key: `day:${date.toDateString()}`,
    date,
    relative: relativeDayLabel(date, today),
    weekday: weekdayLabel(date),
  };
}

/** The days a section covers; a day section covers exactly its own day. */
export function sectionSpan(section: TimelineSection): { start: Date; end: Date } {
  if (section.kind === 'day') return { start: section.date, end: section.date };
  if (section.kind === 'range') return { start: section.start, end: section.end };
  return { start: section.date, end: endOfMonth(section.date) };
}

/** The day `添加任务` / `创建每日笔记` act on for this section. */
export function sectionActionDate(section: TimelineSection): Date {
  return sectionSpan(section).start;
}

export function dayInSection(section: TimelineSection, day: Date): boolean {
  const { start, end } = sectionSpan(section);
  const value = startOfDay(day).getTime();
  return value >= start.getTime() && value <= end.getTime();
}
