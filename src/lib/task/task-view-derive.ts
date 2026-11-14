import type { TaskItem } from '@/actions/task/task';
import { tasksForGroup, type TaskGroup, type UpcomingWindow } from './grouping';
import {
  filterInboxScheduled,
  matchesTodayView,
  sortTasksForView,
  type TaskViewSettings,
} from './task-view-settings';

/**
 * G604：任务屏三档的行派生——官方 `Ua`（收件箱）与 `$d`（今天）那两段筛选器＋比较器的本地化。
 *
 * - 收件箱：先按「显示计划任务」挑行，再按「排序方式」（安排／截止日期／手动的）排；
 * - 今天：逾期行是否并进来由「显示过去日期」决定（`Od(tomorrow)` 无下界／`Ad(now)` 同日），
 *   因此在 `tasksForGroup` 分桶**之前**过滤——那个分桶把逾期判成「未归档」；
 * - 所有任务：官方那一档是文档分节，「显示计划任务」只作用在其中的收件箱节（`Ha` 自读那枚键），
 *   文档节（`pr`→`Ja`）不看它；本地是扁列表 ⇒ 只筛没有来源文档的行；
 * - 即将进行：沿用分桶，排序与分组由渲染侧的 `upcomingSections` 选项接管。
 */
export function deriveTaskRows(
  tasks: readonly TaskItem[],
  group: TaskGroup,
  window: UpcomingWindow,
  settings: TaskViewSettings,
  now: Date = new Date(),
): TaskItem[] {
  if (group === 'inbox') {
    return sortTasksForView(
      filterInboxScheduled(tasks, settings.inboxShowScheduledTasks),
      settings.inboxTaskSort,
    );
  }
  if (group === 'today') {
    return sortTasksForView(
      tasks.filter((task) => matchesTodayView(task, settings.todayShowPastDueTasks, now)),
      settings.todayTaskSort,
    );
  }
  if (group === 'all') {
    const keptInbox = new Set(
      filterInboxScheduled(
        tasks.filter((task) => task.documentId === null),
        settings.inboxShowScheduledTasks,
      ).map((task) => task.id),
    );
    return tasks.filter((task) => task.documentId !== null || keptInbox.has(task.id));
  }
  return tasksForGroup([...tasks], group, now, window);
}
