import { describe, expect, it } from 'vitest';

import { taskDateCustomLabel, taskDateMenuTitle, taskDateOptions } from './task-date-menu';

// G1597/G1598: two isomorphic four-option panels that differ only by verb.
describe('task date quick menu (G1597/G1598)', () => {
  const wednesday = new Date(2026, 10, 4, 15, 0); // 2026-11-04 周三

  it('prints the deadline labels verbatim', () => {
    expect(taskDateMenuTitle('deadline')).toBe('设定截止日期');
    expect(taskDateOptions('deadline', wednesday).map((option) => option.label)).toEqual([
      '将截止日期设为今天',
      '将截止日期设为明天',
      '将截止日期设为下周一',
    ]);
    expect(taskDateCustomLabel('deadline')).toBe('按日期设定截止日期…');
  });

  it('prints the schedule labels verbatim', () => {
    expect(taskDateMenuTitle('schedule')).toBe('计划任务');
    expect(taskDateOptions('schedule', wednesday).map((option) => option.label)).toEqual([
      '安排到今天',
      '安排到明天',
      '安排到下周一',
    ]);
    expect(taskDateCustomLabel('schedule')).toBe('按日期安排…');
  });

  it('resolves the three dates and moves Monday to next week', () => {
    const dates = taskDateOptions('schedule', wednesday).map((option) => option.date.getDate());
    expect(dates).toEqual([4, 5, 9]);
    const monday = new Date(2026, 10, 9, 9);
    expect(taskDateOptions('schedule', monday)[2].date.getDate()).toBe(16);
  });
});
