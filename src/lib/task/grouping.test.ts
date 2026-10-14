import { describe, expect, it } from 'vitest';

import type { TaskItem } from '@/actions/task/task';

import { applyCompletedFilter, bucketOf, localDayIndex, tasksForGroup, withinUpcoming } from './grouping';

const task = (dueDate: string | null): TaskItem => ({
  id: 't',
  title: '任务',
  isCompleted: false,
  status: 'todo',
  cancelledAt: null,
  dueDate,
  remindAt: null,
  recurrence: null,
  recurrenceEnd: null,
  documentId: null,
});

// Fixed local noon so the assertions are about the *calendar day* and never about when the test
// machine happens to run.
const now = new Date(2026, 9, 9, 12, 0, 0);
const iso = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m, d, h, min).toISOString();

describe('the upcoming windows', () => {
  const now = new Date(2026, 9, 14, 12, 0);

  it('counts from tomorrow and stops at the window', () => {
    const iso = (day: number) => new Date(2026, 9, day, 9).toISOString();
    expect(withinUpcoming(iso(14), 7, now)).toBe(false);
    expect(withinUpcoming(iso(15), 7, now)).toBe(true);
    expect(withinUpcoming(iso(21), 7, now)).toBe(true);
    expect(withinUpcoming(iso(22), 7, now)).toBe(false);
    expect(withinUpcoming(iso(22), 30, now)).toBe(true);
  });

  it('keeps everything when the window is open', () => {
    expect(withinUpcoming(null, 'all', now)).toBe(true);
  });
});

describe('the completed switch', () => {
  const done = { ...task(null), id: 'done', isCompleted: true, status: 'done' as const };
  const open = { ...task(null), id: 'open' };
  // 取消行没勾，但官方那枚开关照样把它算进"退出默认视野"那一档（`api-contract.md:36`）。
  const cancelled = {
    ...task(null),
    id: 'cancelled',
    status: 'cancelled' as const,
    cancelledAt: '2026-10-09T02:00:00.000Z',
  };

  it('hides completed tasks unless the switch is on', () => {
    expect(applyCompletedFilter([open, done], false).map((item) => item.id)).toEqual(['open']);
    expect(applyCompletedFilter([open, done], true).map((item) => item.id)).toEqual(['open', 'done']);
  });

  it('已取消与已完成同档：默认藏着，开关打开才一起放进来', () => {
    expect(applyCompletedFilter([open, cancelled], false).map((item) => item.id)).toEqual(['open']);
    expect(applyCompletedFilter([open, cancelled], true).map((item) => item.id)).toEqual([
      'open',
      'cancelled',
    ]);
  });

  it('只滤 isCompleted 是不够的——取消行没勾，必须看 status 才藏得住', () => {
    // 这一枚就是 G52 登记的行为差异本身：`!isCompleted` 的旧判据下它是绿的。
    expect(cancelled.isCompleted).toBe(false);
    expect(applyCompletedFilter([cancelled], false)).toEqual([]);
  });

  it('本地附加的 doing 仍算 pending，不被这枚开关收走', () => {
    const doing = { ...task(null), id: 'doing', status: 'doing' as const };
    expect(applyCompletedFilter([doing, done], false).map((item) => item.id)).toEqual(['doing']);
  });

  it('没有 status 的老行退回 isCompleted 判定', () => {
    const legacy = [{ id: 'a', isCompleted: false }, { id: 'b', isCompleted: true }];
    expect(applyCompletedFilter(legacy, false).map((item) => item.id)).toEqual(['a']);
  });
});

describe('localDayIndex', () => {
  it('counts the viewer calendar day, not the UTC one', () => {
    // 23:59 local on Oct 9 is Oct 10 in UTC for a positive offset — the index must stay the 9th.
    const lateLocal = new Date(2026, 9, 9, 23, 59);
    expect(localDayIndex(lateLocal)).toBe(20261009);
    expect(localDayIndex(new Date(2026, 9, 10, 0, 1))).toBe(20261010);
  });
});

describe('bucketOf', () => {
  it('puts a task due later today in 今天 even after midnight UTC has rolled over', () => {
    expect(bucketOf(task(iso(2026, 9, 9, 23, 59)), now)).toBe('today');
    expect(bucketOf(task(iso(2026, 9, 9, 0, 5)), now)).toBe('today');
  });

  it('puts a future due date in 即将进行 and a past one in neither', () => {
    expect(bucketOf(task(iso(2026, 9, 10, 9)), now)).toBe('upcoming');
    expect(bucketOf(task(iso(2026, 9, 8, 23)), now)).toBe('unscheduled');
  });

  it('treats missing and unparsable due dates as unscheduled', () => {
    expect(bucketOf(task(null), now)).toBe('unscheduled');
    expect(bucketOf(task('不是时间'), now)).toBe('unscheduled');
  });
});

describe('tasksForGroup', () => {
  const tasks = [
    task(iso(2026, 9, 9, 18)), // today
    task(iso(2026, 9, 12, 9)), // upcoming
    task(iso(2026, 9, 1, 9)), // overdue
    task(null), // unscheduled
  ];

  it('splits 今天 and 即将进行 exactly, and leaves overdue out of both', () => {
    expect(tasksForGroup(tasks, 'today', now)).toHaveLength(1);
    expect(tasksForGroup(tasks, 'upcoming', now)).toHaveLength(1);
    expect(tasksForGroup(tasks, 'today', now)[0].dueDate).toBe(iso(2026, 9, 9, 18));
  });

  it('returns everything for 未归档 and 所有任务 while the archive axis does not exist', () => {
    expect(tasksForGroup(tasks, 'inbox', now)).toHaveLength(4);
    expect(tasksForGroup(tasks, 'all', now)).toHaveLength(4);
  });
});
