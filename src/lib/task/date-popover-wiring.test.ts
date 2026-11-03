import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

/**
 * G375：deadline 与 schedule 共用同一个选择器组件；deadline 打开时以已提交的 schedule 为初值；
 * 提醒/重复两行对两族都开放（提醒可挂任一族）。
 */
describe('the shared task date picker (G375)', () => {
  const popover = read('components/task/TaskDatePopover.tsx');
  const tasks = read('app/(app)/tasks/TasksView.tsx');

  it('is one component serving both kinds', () => {
    expect(popover).toContain("kind: 'schedule' | 'deadline'");
    expect(tasks).toContain('kind="schedule"');
    expect(tasks).toContain('kind="deadline"');
  });

  it('offers reminder and repeat on both kinds', () => {
    expect(popover).toContain('const hasExtras = Boolean(reminder && recurrence);');
    expect(popover).not.toContain("kind === 'schedule' && Boolean(reminder");
  });

  it('seeds the deadline picker from the committed schedule', () => {
    expect(popover).toContain('inheritFrom');
    expect(popover).toContain('value ?? inheritFrom ? new Date((value ?? inheritFrom)!) : new Date()');
    // 截止一侧把计划日传进来，两族各自的 onChange 仍分开写。
    expect(tasks).toMatch(/kind="deadline"[\s\S]{0,120}inheritFrom=\{task\.scheduleDate\}/);
    expect(tasks).toMatch(/kind="deadline"[\s\S]{0,400}onChange=\{\(value\) => update\(\{ dueDate: value \}\)\}/);
  });
});
