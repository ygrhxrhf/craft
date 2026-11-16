import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { TaskItem } from '@/actions/task/task';
import {
  UPCOMING_KIND_RANK,
  compareGroups,
  compareScheduled,
  deadlineGroupTitle,
  deadlineGroups,
  sameDay,
  upcomingGroupTitle,
  upcomingGroups,
  upcomingSections,
  upcomingStartDay,
  weekWindow,
} from './upcoming-groups';
import {
  TASK_NO_DEADLINE,
  UPCOMING_THIS_MONTH,
  UPCOMING_THIS_MONTH_KEY,
  UPCOMING_THIS_WEEK,
  UPCOMING_THIS_WEEK_KEY,
} from './official-copy';

/** 2026-10-14 是周三 ⇒ 本周＝10/12（周一）…10/18（周日），下周一＝10/19，明天＝10/15。 */
const NOW = new Date(2026, 9, 14, 13, 30);
const day = (month: number, date: number, hours = 9): Date => new Date(2026, month, date, hours);

function task(id: string, dueDate: string | null, createdAt: string | null = null): TaskItem {
  return {
    id,
    title: id,
    isCompleted: false,
    status: 'todo',
    cancelledAt: null,
    dueDate,
    scheduleDate: dueDate,
    remindAt: null,
    recurrence: null,
    recurrenceEnd: null,
    seriesId: null,
    documentId: null,
    blockId: null,
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

  it('★ 取消那一档不算未完成：开关关着时它不显示，开着时它跟完成行一起回来（G52）', () => {
    // 官方开关加回来的是"完成 **与** 已取消"（api-contract.md:36），而"已取消"行上的勾是空的：
    // 只判 `isCompleted` 的实现会把它当成未办，节头数字与列表都会多出一行。
    const cancelled = (id: string, due: Date): TaskItem => ({
      ...task(id, iso(due)),
      status: 'cancelled',
      cancelledAt: iso(day(9, 13)),
    });

    const off = upcomingSections(
      [task('未办', iso(day(9, 16))), cancelled('取消', day(9, 16)), done('完成', day(9, 16))],
      false,
      NOW
    );
    expect(off.sections).toHaveLength(1);
    expect(off.sections[0]!.undone).toBe(1);
    expect(off.sections[0]!.blocks.map((item) => item.id)).toEqual(['未办']);

    const on = upcomingSections(
      [task('未办', iso(day(9, 16))), cancelled('取消', day(9, 16)), done('完成', day(9, 16))],
      true,
      NOW
    );
    expect(on.sections[0]!.blocks.map((item) => item.id)).toEqual(['未办', '取消', '完成']);
    expect(on.sections[0]!.undone).toBe(1);
  });

  it('一个节里只剩取消行时，开关关着整节不占位', () => {
    const only = upcomingSections(
      [{ ...task('取消', iso(day(9, 16))), status: 'cancelled' as const }],
      false,
      NOW
    );
    expect(only.sections).toEqual([]);
    expect(only.hasScheduled).toBe(true);
  });
});

/** 排期与截止分开写的行——`task()` 把两者写成同一枚日期，deadline 分组测试要的正是这个差别。 */
function row(
  id: string,
  scheduleDate: string | null,
  dueDate: string | null,
  extra: Partial<TaskItem> = {}
): TaskItem {
  return { ...task(id, null), scheduleDate, dueDate, ...extra };
}

describe('deadline 分组（官方 fe）', () => {
  const sections = (tasks: TaskItem[], showCompleted = true) =>
    upcomingSections(tasks, showCompleted, NOW, { groupBy: 'deadline' });

  it('无截止的行单独一节「No Deadline」，节内按排期排、无排期的排最后', () => {
    const result = sections([row('稍后', iso(day(10, 20)), null), row('更早', iso(day(9, 25)), null), row('无日期', null, null)]);
    expect(result.sections[0]!.title).toBe(TASK_NO_DEADLINE);
    expect(result.sections[0]!.blocks.map((item) => item.id)).toEqual(['更早', '稍后', '无日期']);
    expect(result.hasScheduled).toBe(true);
  });

  it('截止落在本周的行并进 week 一节，节头是「本周」；下周一算下一节', () => {
    const { sections: result } = sections([
      row('本周', iso(day(9, 12)), iso(day(9, 16))),
      row('下周一', null, iso(day(9, 19))),
    ]);
    expect(result.map((section) => section.title)).toEqual([UPCOMING_THIS_WEEK, UPCOMING_THIS_MONTH]);
    expect(result[0]!.blocks.map((item) => item.id)).toEqual(['本周']);
    expect(result[1]!.blocks.map((item) => item.id)).toEqual(['下周一']);
  });

  it('本月更晚的截止成「本月」一节，落点夹到下周一；下月一节用自己的月首', () => {
    const groups = deadlineGroups([row('10/25', null, iso(day(9, 25))), row('11/5', null, iso(day(10, 5)))], NOW);
    expect(groups.map((group) => group.id)).toEqual([
      `month:${new Date(2026, 9, 1).getTime()}`,
      `month:${new Date(2026, 10, 1).getTime()}`,
    ]);
    expect(groups[0]!.dropDate).toEqual(new Date(2026, 9, 19));
    expect(groups[1]!.dropDate).toEqual(new Date(2026, 10, 1));
    expect(deadlineGroupTitle(groups[0]!, NOW)).toBe(UPCOMING_THIS_MONTH);
    expect(deadlineGroupTitle(groups[1]!, NOW)).toBe('十一月');
  });

  it('明年的截止升为 year 档，节头日期＝那年一月一号', () => {
    const groups = deadlineGroups([row('2027/3/1', null, iso(new Date(2027, 2, 1, 9)))], NOW);
    expect(groups.map((group) => group.id)).toEqual([`year:${new Date(2027, 0, 1).getTime()}`]);
    expect(deadlineGroupTitle(groups[0]!, NOW)).toBe('2027年');
  });

  it('只有截止、没有排期的行在 deadline 档里成节，在 schedule 档里按有效日期同样成节', () => {
    const list = [row('只有截止', null, iso(day(9, 25)))];
    expect(sections(list).sections).toHaveLength(1);
    // 官方 `C` ＝ schedule ?? deadline，所以 schedule 分组也收只有截止的行。
    expect(upcomingSections(list, true, NOW).sections).toHaveLength(1);
  });

  it('每节内部按截止升序、空截止排最后，再按来源文档 id', () => {
    const groups = deadlineGroups(
      [
        row('10/30', null, iso(day(9, 30))),
        row('10/20', null, iso(day(9, 20))),
        row('无截止', iso(day(9, 16)), null),
      ],
      NOW
    );
    expect(groups[0]!.tasks.map((item) => item.id)).toEqual(['无截止']);
    expect(groups.flatMap((group) => group.tasks.map((item) => item.id)).slice(1)).toEqual(['10/20', '10/30']);
  });
});

describe('document 分组（官方 ke）', () => {
  const withDoc = (
    id: string,
    documentId: string | null,
    documentTitle: string | null,
    updatedAt: string | null,
    scheduleDate: string | null = null
  ): TaskItem => ({
    ...task(id, scheduleDate),
    documentId,
    documentTitle,
    documentUpdatedAt: updatedAt,
    documentCreatedAt: updatedAt,
  });

  const sections = (
    tasks: TaskItem[],
    options: { documentSort?: 'created' | 'modified' | 'title'; taskSort?: 'schedule' | 'deadline' } = {}
  ) => upcomingSections(tasks, true, NOW, { groupBy: 'document', ...options });

  it('无文档的行钉成「未归档」一节，排在文档组之前', () => {
    const result = sections([
      withDoc('a', 'doc-1', '文档一', iso(day(9, 20))),
      withDoc('b', null, null, null, iso(day(9, 16))),
    ]);
    expect(result.sections.map((section) => section.title)).toEqual(['未归档', '文档一']);
    expect(result.hasScheduled).toBe(true);
  });

  it('文档组按更新日期降序（新文档在前）', () => {
    const result = sections([
      withDoc('旧', 'doc-old', '旧文档', iso(day(8, 1))),
      withDoc('新', 'doc-new', '新文档', iso(day(9, 20))),
    ]);
    expect(result.sections.map((section) => section.title)).toEqual(['新文档', '旧文档']);
  });

  it('按名称排序时用 localeCompare 升序，同名再比文档 id', () => {
    const result = sections(
      [withDoc('b', 'doc-b', '乙', null), withDoc('a', 'doc-a', '甲', null)],
      { documentSort: 'title' }
    );
    expect(result.sections.map((section) => section.title)).toEqual(['乙', '甲'].sort((x, y) => x.localeCompare(y, 'zh-CN')));
    expect(result.sections.map((section) => section.key)).toEqual(['doc:doc-a', 'doc:doc-b']);
  });

  it('组内任务按 taskSort 排：deadline 档按截止日期升序', () => {
    const result = sections(
      [
        withDoc('后', 'doc-1', '文档一', null, iso(day(9, 30))),
        withDoc('前', 'doc-1', '文档一', null, iso(day(9, 20))),
      ],
      { taskSort: 'deadline' }
    );
    expect(result.sections[0]!.blocks.map((item) => item.id)).toEqual(['前', '后']);
  });

  it('关掉「显示已完成」时组内只留未完成行，整组全完成则不占位', () => {
    const done = { ...withDoc('done', 'doc-1', '文档一', null), isCompleted: true, status: 'done' as const };
    const hidden = upcomingSections([done], false, NOW, { groupBy: 'document' });
    expect(hidden.sections).toEqual([]);
    expect(hidden.hasScheduled).toBe(true);
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
