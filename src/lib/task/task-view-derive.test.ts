import { describe, expect, it } from 'vitest';

import type { TaskItem } from '@/actions/task/task';
import { DEFAULT_TASK_VIEW_SETTINGS, type TaskViewSettings } from '@/lib/task/task-view-settings';
import { deriveTaskRows } from '@/lib/task/task-view-derive';

const NOW = new Date(2026, 10, 14, 12, 0, 0);
const at = (y: number, m: number, d: number, h = 9): string => new Date(y, m - 1, d, h).toISOString();

function task(id: string, patch: Partial<TaskItem> = {}): TaskItem {
  return {
    id,
    title: id,
    isCompleted: false,
    status: 'todo',
    cancelledAt: null,
    dueDate: null,
    scheduleDate: null,
    remindAt: null,
    recurrence: null,
    recurrenceEnd: null,
    seriesId: null,
    documentId: null,
    blockId: null,
    ...patch,
  };
}

const settings = (patch: Partial<TaskViewSettings>): TaskViewSettings => ({
  ...DEFAULT_TASK_VIEW_SETTINGS,
  ...patch,
});

describe('deriveTaskRows (G604)', () => {
  it('inbox drops scheduled rows when 「显示计划任务」 is off', () => {
    const rows = [
      task('a', { scheduleDate: at(2026, 11, 20) }),
      task('b', { dueDate: at(2026, 11, 20) }),
    ];
    expect(deriveTaskRows(rows, 'inbox', 'all', settings({ inboxShowScheduledTasks: false }), NOW)).toEqual([
      rows[1],
    ]);
    expect(deriveTaskRows(rows, 'inbox', 'all', settings({ inboxShowScheduledTasks: true }), NOW)).toHaveLength(2);
  });

  it('inbox sorts by the chosen key, nulls last', () => {
    const rows = [
      task('no-schedule'),
      task('late', { scheduleDate: at(2026, 11, 20) }),
      task('early', { scheduleDate: at(2026, 11, 10) }),
    ];
    expect(
      deriveTaskRows(rows, 'inbox', 'all', settings({ inboxTaskSort: 'schedule' }), NOW).map((r) => r.id),
    ).toEqual(['early', 'late', 'no-schedule']);
    // 手动的按落库位次；未拖过的（无 order）按 0 比较，稳定排序保持页内原顺序。
    expect(
      deriveTaskRows(
        [task('x', { order: 1 }), task('y', { order: 0 }), task('z')],
        'inbox',
        'all',
        settings({ inboxTaskSort: 'manual' }),
        NOW,
      ).map((r) => r.id),
    ).toEqual(['y', 'z', 'x']);
  });

  it('today keeps overdue rows only when 「显示过去日期」 is on, and pulls deadline-only rows in', () => {
    const rows = [
      task('overdue', { scheduleDate: at(2026, 10, 1) }),
      task('today', { scheduleDate: at(2026, 11, 14) }),
      task('deadline-today', { dueDate: at(2026, 11, 14, 12) }),
      task('future', { scheduleDate: at(2026, 11, 20) }),
    ];
    expect(deriveTaskRows(rows, 'today', 'all', settings({ todayShowPastDueTasks: true }), NOW).map((r) => r.id)).toEqual([
      'overdue',
      'today',
      'deadline-today',
    ]);
    expect(deriveTaskRows(rows, 'today', 'all', settings({ todayShowPastDueTasks: false }), NOW).map((r) => r.id)).toEqual([
      'today',
      'deadline-today',
    ]);
  });

  it('today orders rows by the task sort, not by document', () => {
    const rows = [
      task('due-first', { dueDate: at(2026, 11, 14, 8), scheduleDate: at(2026, 11, 14, 18) }),
      task('sched-first', { dueDate: at(2026, 11, 14, 18), scheduleDate: at(2026, 11, 14, 8) }),
    ];
    expect(deriveTaskRows(rows, 'today', 'all', settings({ todayTaskSort: 'schedule' }), NOW).map((r) => r.id)).toEqual([
      'sched-first',
      'due-first',
    ]);
    expect(deriveTaskRows(rows, 'today', 'all', settings({ todayTaskSort: 'deadline' }), NOW).map((r) => r.id)).toEqual([
      'due-first',
      'sched-first',
    ]);
  });

  it('upcoming keeps only future-scheduled rows; all keeps the whole list', () => {
    const rows = [
      task('today', { scheduleDate: at(2026, 11, 14) }),
      task('future', { scheduleDate: at(2026, 11, 20) }),
      task('unscheduled'),
    ];
    expect(deriveTaskRows(rows, 'upcoming', 'all', DEFAULT_TASK_VIEW_SETTINGS, NOW).map((r) => r.id)).toEqual(['future']);
    expect(deriveTaskRows(rows, 'all', 'all', DEFAULT_TASK_VIEW_SETTINGS, NOW).map((r) => r.id)).toEqual([
      'today',
      'future',
      'unscheduled',
    ]);
  });

  it('all filters only the inbox rows when 「显示计划任务」 is off, document rows stay', () => {
    const rows = [
      task('inbox-scheduled', { scheduleDate: at(2026, 11, 20) }),
      task('inbox-plain'),
      task('doc-scheduled', { scheduleDate: at(2026, 11, 20), documentId: 'doc-1' }),
      task('doc-plain', { documentId: 'doc-1' }),
    ];
    expect(deriveTaskRows(rows, 'all', 'all', settings({ inboxShowScheduledTasks: false }), NOW).map((r) => r.id)).toEqual([
      'inbox-plain',
      'doc-scheduled',
      'doc-plain',
    ]);
    expect(deriveTaskRows(rows, 'all', 'all', settings({ inboxShowScheduledTasks: true }), NOW)).toHaveLength(4);
  });
});
