/**
 * G1529：把任务移到文档 / 每日笔记的成功与失败反馈。句子逐字取语言包：
 * `alert.task.moved.to`（单/复同句）、`tasks.task.moved.to.daily.note`、
 * `tasks.tasks.moved.to.daily.note`、失败 `tasks.task.moved.error`。
 */

export const TASK_MOVED_TO_TEMPLATE = '任务已移至 [0]';
export const TASK_MOVED_TO_KEY = 'alert.task.moved.to';

export const TASK_MOVED_TO_DAILY = '任务移至每日笔记';
export const TASK_MOVED_TO_DAILY_KEY = 'tasks.task.moved.to.daily.note';

export const TASKS_MOVED_TO_DAILY = '任务移至每日笔记';
export const TASKS_MOVED_TO_DAILY_KEY = 'tasks.tasks.moved.to.daily.note';

export const TASK_MOVE_FAILED = '无法将任务移至每日笔记。请刷新页面并重试。';
export const TASK_MOVE_FAILED_KEY = 'tasks.task.moved.error';

/** 成功句：目标是某篇文档时带标题；目标是每日笔记时用那两句（单复数同名）。 */
export function taskMovedMessage(options: { count: number; documentTitle?: string | null }): string {
  if (options.documentTitle) return TASK_MOVED_TO_TEMPLATE.replace('[0]', options.documentTitle);
  return options.count > 1 ? TASKS_MOVED_TO_DAILY : TASK_MOVED_TO_DAILY;
}
