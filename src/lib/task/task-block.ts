import type { TaskItem } from '@/actions/task/task';

/**
 * G1529：把一条任务投影成正文里的 `taskItem` 块（移到文档/每日笔记时插入）。
 * 只带任务自己的字段：勾选态、取消态与标题；排期/重复仍留在任务行上。
 */
export function buildTaskItemBlock(task: Pick<TaskItem, 'title' | 'isCompleted' | 'status'>): Record<string, unknown> {
  const attrs: Record<string, unknown> = { checked: task.isCompleted === true };
  if (task.status === 'cancelled') attrs.cancelled = true;
  return {
    type: 'taskItem',
    attrs,
    content: [{ type: 'paragraph', content: task.title ? [{ type: 'text', text: task.title }] : [] }],
  };
}
