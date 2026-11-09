import type { TaskItem } from '@/actions/task/task';
import { applyCompletedFilter } from '@/lib/task/grouping';

export function tasksByCalendarDay(tasks: readonly TaskItem[], showCompleted: boolean): Map<string, TaskItem[]> {
  const map = new Map<string, TaskItem[]>();
  for (const task of applyCompletedFilter(tasks, showCompleted)) {
    const days = new Set(
      [task.scheduleDate, task.dueDate]
        .filter((day): day is string => Boolean(day))
        .map((day) => new Date(day).toDateString()),
    );
    for (const key of days) {
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
  }
  return map;
}
