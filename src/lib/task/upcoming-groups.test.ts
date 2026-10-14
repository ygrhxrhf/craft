import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { TaskItem } from '@/actions/task/task';
import {
  UPCOMING_KIND_RANK,
  compareGroups,
  compareScheduled,
  sameDay,
  upcomingGroupTitle,
  upcomingGroups,
  upcomingSections,
  upcomingStartDay,
  weekWindow,
} from './upcoming-groups';
import { UPCOMING_THIS_MONTH, UPCOMING_THIS_MONTH_KEY, UPCOMING_THIS_WEEK, UPCOMING_THIS_WEEK_KEY } from './official-copy';

/** 2026-10-14 是周三 ⇒ 本周＝10/12（周一）…10/18（周日），下周一＝10/19，明天＝10/15。 */
const NOW = new Date(2026, 9, 14, 13, 30);
const day = (month: number, date: number, hours = 9): Date => new Date(2026, month, date, hours);

function task(id: string, dueDate: string | null, createdAt: string | null = null): TaskItem {
  return {
    id,
    title: id,
    isCompleted: false,
    dueDate,
    remindAt: null,
    recurrence: null,
    recurrenceEnd: null,
    documentId: null,
    createdAt,
  };
}

const iso = (date: Date): string => date.toISOString();

const titles = (tasks: TaskItem[]): string[] =>
  upcomingGroups(tasks, NOW).map((group) => upcomingGroupTitle(group, NOW));

const headers = (tasks: TaskItem[]): string[] =>
  upcomingGroups(tasks, NOW).map(
    (group) => `${group.kind}@${group.date.getFullYear()}-${group.date.getMonth() + 1}-${group.date.getDate()}`
  );

describe('weekWindow / upcomingStartDay', () => {
  it('周一起算，右端点是周日日终（官方 r7 两端闭区间）', () => {
    const week = weekWindow(NOW);
    expect(week.start).toEqual(new Date(2026, 9, 12, 0, 0, 0, 0));
    expect(week.end).toEqual(new Date(2026, 9, 18, 23, 59, 59, 999));
    expect(week.next).toEqual(new Date(2026, 9, 19, 0, 0, 0, 0));
  });

  it('官方的 D() 是明天零点，不是今天', () => {
    expect(upcomingStartDay(NOW)).toEqual(new Date(2026, 9, 15, 0, 0, 0, 0));
  });
});

describe('upcomingGroups 的三档分组', () => {
  it('本周内的排期（含今天与本周早先的逾期项）并成一节，节头日期＝明天', () => {
    const groups = upcomingGroups(
      [task('周一逾期', iso(day(9, 12))), task('今天', iso(day(9, 14))), task('周日日终', iso(day(9, 18, 23)))],
      NOW
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.kind).toBe('week');
    expect(groups[0]!.date).toEqual(upcomingStartDay(NOW));
    expect(groups[0]!.tasks.map((t) => t.id)).toEqual(['周一逾期', '今天', '周日日终']);
  });

  it('跨过周日的排期改按月并节，节头夹到下周一起点', () => {
    expect(headers([task('10/25', iso(day(9, 25)))])).toEqual(['month@2026-10-19']);
    expect(titles([task('10/25', iso(day(9, 25)))])).toEqual([UPCOMING_THIS_MONTH]);
  });

  it('同月的两枚任务只成一节，不因时刻不同而裂节', () => {
    const groups = upcomingGroups([task('10/25', iso(day(9, 25, 9))), task('10/30', iso(day(9, 30, 21)))], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.tasks.map((t) => t.id)).toEqual(['10/25', '10/30']);
  });

  it('更晚的月份用该月一号作节头，标题取长月名', () => {
    expect(headers([task('11/20', iso(day(10, 20)))])).toEqual(['month@2026-11-1']);
    expect(titles([task('11/20', iso(day(10, 20)))])).toEqual(['十一月']);
  });

  it('只有年份大于今年才升为 year 档', () => {
    expect(headers([task('2027/3/1', iso(new Date(2027, 2, 1, 9)))])).toEqual(['year@2027-1-1']);
    expect(titles([task('2027/3/1', iso(new Date(2027, 2, 1, 9)))])).toEqual(['2027年']);
    expect(headers([task('12/31', iso(day(11, 31)))])).toEqual(['month@2026-12-1']);
  });

  it('没有排期的块整个跳过（官方 if (schedule == null) continue）', () => {
    expect(upcomingGroups([task('无排期', null)], NOW)).toEqual([]);
    expect(upcomingGroups([task('无排期', '不是日期')], NOW)).toEqual([]);
  });

  it('逾期满月的任务并进夹到下周一的当月节，而不是消失', () => {
    expect(headers([task('9/20', iso(day(8, 20)))])).toEqual(['month@2026-10-19']);
  });

  it('节按 S 升序：本周 → 本月 → 十一月 → 十二月 → 2027 年', () => {
    expect(
      titles(
        [
          task('明年', iso(new Date(2027, 5, 1, 9))),
          task('十二月', iso(day(11, 5))),
          task('十一月', iso(day(10, 5))),
          task('本月后段', iso(day(9, 25))),
          task('今天', iso(day(9, 14))),
        ]
      )
    ).toEqual([UPCOMING_THIS_WEEK, UPCOMING_THIS_MONTH, '十一月', '十二月', '2027年']);
  });
});

describe('compareScheduled（官方 W）', () => {
  const scheduled = (ms: number): Date => new Date(ms);

  it('无排期排在最前而不是最后', () => {
    expect(compareScheduled({ schedule: null }, { schedule: scheduled(1_000) })).toBe(-1);
    expect(compareScheduled({ schedule: scheduled(1_000) }, { schedule: null })).toBe(1);
    expect(compareScheduled({ schedule: null }, { schedule: null })).toBe(0);
  });

  it('排期相同退到创建时间升序', () => {
    const at = scheduled(5_000);
    expect(compareScheduled({ schedule: at, createdMs: 400 }, { schedule: at, createdMs: 900 })).toBe(-500);
    expect(compareScheduled({ schedule: at, createdMs: 900 }, { schedule: at, createdMs: 400 })).toBe(500);
    expect(compareScheduled({ schedule: at }, { schedule: at })).toBe(0);
  });

  it('节内先按排期升序', () => {
    const groups = upcomingGroups(
      [task('晚', iso(day(10, 20))), task('早', iso(day(10, 16))), task('更早', iso(day(10, 15)))],
      NOW
    );
    expect(groups.flatMap((group) => group.tasks.map((t) => t.id))).toEqual(['更早', '早', '晚']);
  });

  it('同排期时按创建时间升序（先建的在前）', () => {
    const due = iso(day(10, 20));
    const groups = upcomingGroups(
      [task('后建', due, iso(day(10, 10, 12))), task('先建', due, iso(day(10, 9, 8)))],
      NOW
    );
    expect(groups[0]!.tasks.map((t) => t.id)).toEqual(['先建', '后建']);
  });
});

describe('compareGroups（官方 S）', () => {
  it('日期完全相同比 T 档序：week < month < year', () => {
    const at = new Date(2026, 9, 15);
    for (const [a, b] of [
      ['week', 'month'],
      ['month', 'year'],
      ['week', 'year'],
    ] as const) {
      expect(compareGroups({ kind: a, date: at }, { kind: b, date: at }, NOW)).toBeLessThan(0);
      expect(compareGroups({ kind: b, date: at }, { kind: a, date: at }, NOW)).toBeGreaterThan(0);
    }
    expect(UPCOMING_KIND_RANK.week).toBe(0);
    expect(UPCOMING_KIND_RANK.month).toBe(1);
    expect(UPCOMING_KIND_RANK.year).toBe(2);
  });

  it('节头与明天同日的节钉在最前，即使另一节的时间戳更早', () => {
    const pinned = { kind: 'month' as const, date: new Date(2026, 9, 15, 20, 0) };
    const earlier = { kind: 'month' as const, date: new Date(2026, 9, 14, 23, 0) };
    expect(pinned.date.getTime()).toBeGreaterThan(earlier.date.getTime());
    expect(compareGroups(pinned, earlier, NOW)).toBe(-1);
    expect(compareGroups(earlier, pinned, NOW)).toBe(1);
  });

  it('都不与明天同日时只比日期升序', () => {
    const a = { kind: 'month' as const, date: new Date(2026, 9, 19) };
    const b = { kind: 'month' as const, date: new Date(2026, 10, 1) };
    expect(compareGroups(b, a, NOW)).toBeGreaterThan(0);
    expect(compareGroups(a, b, NOW)).toBeLessThan(0);
  });
});

describe('节头文案', () => {
  it('year 档只给年份数字，month 档在本月用「本月」', () => {
    expect(upcomingGroupTitle({ kind: 'year', date: new Date(2027, 0, 1) }, NOW)).toBe('2027年');
    expect(upcomingGroupTitle({ kind: 'month', date: new Date(2026, 9, 19) }, NOW)).toBe(UPCOMING_THIS_MONTH);
    expect(upcomingGroupTitle({ kind: 'month', date: new Date(2027, 0, 1) }, NOW)).toBe('一月');
    expect(upcomingGroupTitle({ kind: 'week', date: new Date(2026, 9, 15) }, NOW)).toBe(UPCOMING_THIS_WEEK);
  });

  it('sameDay 只比年月日', () => {
    expect(sameDay(new Date(2026, 9, 15, 1), new Date(2026, 9, 15, 23, 59))).toBe(true);
    expect(sameDay(new Date(2026, 9, 15), new Date(2026, 9, 16))).toBe(false);
  });
});

describe('upcomingSections（官方 H1 的展示规则）', () => {
  const done = (id: string, due: Date): TaskItem => ({ ...task(id, iso(due)), isCompleted: true });

  it('键是 `${kind}:${date.getTime()}`，副标题是未完成数', () => {
    const { sections } = upcomingSections(
      [task('a', iso(day(9, 15))), task('b', iso(day(9, 16))), done('c', day(9, 17))],
      true,
      NOW
    );
    expect(sections).toHaveLength(1);
    expect(sections[0]!.key).toBe(`week:${new Date(2026, 9, 15).getTime()}`);
    expect(sections[0]!.title).toBe(UPCOMING_THIS_WEEK);
    expect(sections[0]!.undone).toBe(2);
    expect(sections[0]!.blocks).toHaveLength(3);
  });

  it('关掉「显示已完成」时 b＝未完成，整节全完成则不占位（isVisible:false）', () => {
    const off = upcomingSections(
      [task('本周', iso(day(9, 16))), done('本月', day(9, 25))],
      false,
      NOW
    );
    expect(off.sections.map((section) => [section.title, section.blocks.length, section.undone])).toEqual([
      [UPCOMING_THIS_WEEK, 1, 1],
    ]);
    expect(off.hasScheduled).toBe(true);
  });

  it('没有任何排期时 hasScheduled 为假，与「有但都做完了」可分辨', () => {
    expect(upcomingSections([task('无排期', null)], false, NOW)).toEqual({ sections: [], hasScheduled: false });
  });
});

describe('台账核对', () => {

  const catalog = readFileSync(
    new URL('../../../docs/craft-ref/features/feature-catalog.md', import.meta.url),
    'utf8'
  );

  it.each([
    [UPCOMING_THIS_WEEK, UPCOMING_THIS_WEEK_KEY],
    [UPCOMING_THIS_MONTH, UPCOMING_THIS_MONTH_KEY],
  ])('%s 逐字来自台账的 %s', (value, key) => {
    expect(catalog).toMatch(new RegExp(`^- ${value}\\s+\`${key}\``, 'm'));
  });

  it('getTasks 的只读投影带出 createdAt，W 的次级比较才有输入', () => {
    const source = readFileSync(new URL('../../actions/task/task.ts', import.meta.url), 'utf8');
    expect(source).toMatch(/createdAt: row\.createdAt/);
    expect(source).toMatch(/createdAt\?: string \| null/);
  });

  it('任务页的「即将进行」走分节时间轴，不再是平铺列表', () => {
    const view = readFileSync(
      new URL('../../app/(app)/tasks/TasksView.tsx', import.meta.url),
      'utf8'
    );
    expect(view).toMatch(/group === 'upcoming'\s*\n?\s*\? upcomingSections\(/);
    expect(view).toMatch(/sectioned\.sections\.map/);
    // 节头 = 标题 + 未完成数（官方 subtitle={f.length}），列表 = b（showCompleted ? n : f）
    expect(view).toMatch(/<span className="text-foreground">\{section\.title\}<\/span>/);
    expect(view).toMatch(/<span className="text-muted-foreground">\{section\.undone\}<\/span>/);
    expect(view).toMatch(/items=\{section\.blocks\}/);
    expect(view).toMatch(/data-testid="upcoming-section"/);
  });
});
