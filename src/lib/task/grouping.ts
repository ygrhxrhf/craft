import type { TaskItem } from '@/actions/task/task';
import { isPending, type TaskLineStatus } from '@/lib/editor/task-status';

/**
 * The four official groups of the tasks page (`gap.md` G46): 未归档 / 今天 / 即将进行 / 所有任务,
 * with 「今天」 and 「即将进行」 driven by the schedule field — that is the prescription attached
 * to the row, and the labels are the verbatim `browse.sidebar.inbox` / `tasks.today` /
 * `tasks.upcoming` / `tasks.all.tasks` strings.
 */
export type TaskGroup = 'inbox' | 'today' | 'upcoming' | 'all';

/** Local calendar day as a comparable number — `dueDate` is a timestamptz, so the day boundary
 *  has to be the viewer's, not UTC's: 23:59 local is still 今天 even when UTC says tomorrow. */
export function localDayIndex(value: Date): number {
  return value.getFullYear() * 10000 + (value.getMonth() + 1) * 100 + value.getDate();
}

export type TaskBucket = 'today' | 'upcoming' | 'unscheduled';

/** 接下来的 7 天 / 接下来的 30 天 (`calendar.date.next.*`). Counting starts tomorrow. */
export type UpcomingWindow = 7 | 30 | 'all';

export function withinUpcoming(dueDate: string | null, window: UpcomingWindow, now: Date = new Date()): boolean {
  if (window === 'all') return true;
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const ahead = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  return ahead >= 1 && ahead <= window;
}

export function bucketOf(task: Pick<TaskItem, 'dueDate'>, now: Date = new Date()): TaskBucket {
  if (!task.dueDate) return 'unscheduled';
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return 'unscheduled';
  const dueDay = localDayIndex(due);
  const today = localDayIndex(now);
  if (dueDay === today) return 'today';
  return dueDay > today ? 'upcoming' : 'unscheduled'; // already past: it is overdue, not upcoming
}

/**
 * Select the rows for one group. Two local readings are declared rather than invented silently:
 *
 * - `inbox` and `all` currently return the same rows, because this build's `Task` has no archived
 *   column at all — official 「未归档」 translates the `isArchived` axis (G176), and until that
 *   axis exists the two views cannot differ. Adding it is a schema batch, not a grouping one.
 * - A **past** due date is treated as neither 今天 nor 即将进行; it shows up in `inbox`/`all` only.
 *   The official row does not describe an "overdue" group, so one is not fabricated here.
 */
/**
 * 「显示已完成的任务」(`show.completed.tasks`). Off hides them; the caller passes the switch, so a
 * view that has not grown one yet keeps showing everything.
 */
/** The switch is remembered on the device, and it starts off. */
export const SHOW_COMPLETED_KEY = 'craft.tasks.showCompleted';

export function readShowCompleted(storage: { getItem(key: string): string | null }): boolean {
  return storage.getItem(SHOW_COMPLETED_KEY) === 'true';
}

export function writeShowCompleted(storage: { setItem(key: string, value: string): void }, show: boolean): void {
  storage.setItem(SHOW_COMPLETED_KEY, String(show));
}

export function applyCompletedFilter<T extends { isCompleted: boolean; status?: TaskLineStatus | 'doing' }>(
  tasks: readonly T[],
  showCompleted: boolean,
): T[] {
  // 官方那枚开关只管一件事：默认只显示 pending，打开才把完成与**取消**一起放进来
  // （`api-contract.md:36`）。所以这里问的是"还活着吗"，而不是"勾了吗"——只滤 `isCompleted`
  // 的话，取消掉的行会一直挂在日历与任务视图上，正是 G52 登记的那处行为差异。
  return showCompleted
    ? [...tasks]
    : tasks.filter((task) => isPending(task.status ?? (task.isCompleted ? 'done' : 'todo')));
}

export function tasksForGroup(
  tasks: TaskItem[],
  group: TaskGroup,
  now: Date = new Date(),
  window: UpcomingWindow = 'all',
): TaskItem[] {
  switch (group) {
    case 'today':
      return tasks.filter((task) => bucketOf(task, now) === 'today');
    case 'upcoming':
      return tasks.filter(
        (task) => bucketOf(task, now) === 'upcoming' && withinUpcoming(task.dueDate, window, now),
      );
    case 'inbox':
    case 'all':
      return tasks;
  }
}
