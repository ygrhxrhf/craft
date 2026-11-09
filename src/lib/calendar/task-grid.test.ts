import { describe, expect, it } from 'vitest';
import type { TaskItem } from '@/actions/task/task';
import { tasksByCalendarDay } from './task-grid';

function task(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    title: 'Task',
    isCompleted: false,
    status: 'todo',
    cancelledAt: null,
    dueDate: null,
    scheduleDate: null,
    remindAt: null,
    recurrence: null,
    recurrenceEnd: null,
    documentId: null,
    ...overrides,
  };
}

describe('calendar task grid dates (G15)', () => {
  it('places a scheduled task on its schedule date, independently of its deadline', () => {
    const scheduled = task({
      dueDate: new Date(2026, 8, 12, 18).toISOString(),
      scheduleDate: new Date(2026, 8, 10, 9).toISOString(),
    });

    const byDay = tasksByCalendarDay([scheduled], false);

    expect(byDay.get(new Date(2026, 8, 10).toDateString())).toEqual([scheduled]);
    expect(byDay.get(new Date(2026, 8, 12).toDateString())).toEqual([scheduled]);
  });

  it('keeps deadline-only tasks visible on their deadline day', () => {
    const deadlineOnly = task({ dueDate: new Date(2026, 8, 12, 18).toISOString() });

    expect(tasksByCalendarDay([deadlineOnly], false).get(new Date(2026, 8, 12).toDateString())).toEqual([deadlineOnly]);
  });

  it('does not place a task with neither schedule nor deadline', () => {
    expect(tasksByCalendarDay([task()], false).size).toBe(0);
  });
});
