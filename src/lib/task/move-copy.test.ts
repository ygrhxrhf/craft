import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  TASK_MOVED_TO_DAILY,
  TASK_MOVED_TO_DAILY_KEY,
  TASK_MOVED_TO_KEY,
  TASK_MOVED_TO_TEMPLATE,
  TASK_MOVE_FAILED,
  TASK_MOVE_FAILED_KEY,
  TASKS_MOVED_TO_DAILY,
  TASKS_MOVED_TO_DAILY_KEY,
  taskMovedMessage,
} from './move-copy';
import { buildTaskItemBlock } from './task-block';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  return line ? /^-\s+(.+?)\s+`/.exec(line.trim())?.[1] ?? null : null;
}

describe('task move copy (G1529)', () => {
  it('takes every sentence from the catalog', () => {
    expect(ledgerValue(TASK_MOVED_TO_KEY)).toBe(TASK_MOVED_TO_TEMPLATE);
    expect(ledgerValue(TASK_MOVED_TO_DAILY_KEY)).toBe(TASK_MOVED_TO_DAILY);
    expect(ledgerValue(TASKS_MOVED_TO_DAILY_KEY)).toBe(TASKS_MOVED_TO_DAILY);
    expect(ledgerValue(TASK_MOVE_FAILED_KEY)).toBe(TASK_MOVE_FAILED);
  });

  it('fills the document slot, and uses the daily-note sentence otherwise', () => {
    expect(taskMovedMessage({ count: 1, documentTitle: '周报' })).toBe('任务已移至 周报');
    expect(taskMovedMessage({ count: 1 })).toBe('任务移至每日笔记');
    expect(taskMovedMessage({ count: 3 })).toBe('任务移至每日笔记');
  });
});

describe('the moved block (G1529)', () => {
  it('carries the title and both states', () => {
    expect(buildTaskItemBlock({ title: '写周报', isCompleted: true, status: 'done' })).toEqual({
      type: 'taskItem',
      attrs: { checked: true },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '写周报' }] }],
    });
    expect(buildTaskItemBlock({ title: '', isCompleted: false, status: 'cancelled' }).attrs).toEqual({
      checked: false,
      cancelled: true,
    });
  });
});

describe('the move menu is wired (G1529)', () => {
  const read = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

  it('hangs off the task row and calls the move action', () => {
    expect(read('app/(app)/tasks/TasksView.tsx')).toContain('<TaskMoveMenu taskId={task.id}');
    const menu = read('components/task/TaskMoveMenu.tsx');
    expect(menu).toContain('moveTaskToDocument(taskId, target)');
    expect(menu).toContain('taskMovedMessage({ count: 1, documentTitle: result.documentTitle })');
    expect(menu).toContain('TASK_MOVE_FAILED');
  });
});
