import { describe, expect, it } from 'vitest';

import type { TaskItem } from '@/actions/task/task';

import { applyCompletedFilter, bucketOf, localDayIndex, tasksForGroup } from './grouping';

const task = (dueDate: string | null): TaskItem => ({
  id: 't',
  title: '任务',
  isCompleted: false,
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

describe('the completed switch', () => {
  const done = { ...task(null), id: 'done', isCompleted: true };
  const open = { ...task(null), id: 'open' };

  it('hides completed tasks unless the switch is on', () => {
    expect(applyCompletedFilter([open, done], false).map((item) => item.id)).toEqual(['open']);
    expect(applyCompletedFilter([open, done], true).map((item) => item.id)).toEqual(['open', 'done']);
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
