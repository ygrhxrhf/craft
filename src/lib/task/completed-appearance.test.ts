import { describe, expect, it } from 'vitest';

import {
  COMPLETED_TASK_APPEARANCE_DESC,
  COMPLETED_TASK_APPEARANCE_LABELS,
  COMPLETED_TASK_APPEARANCE_TITLE,
  appearanceFromUserRows,
  completedTaskClasses,
  normalizeCompletedTaskAppearance,
} from './completed-appearance';

/**
 * `gap.md` G160 —— 已完成任务的外观三档。官方逐字（`_harvest/i18n-zh.tsv:2364-2369`）：
 * 标题「完成任务的外观」／说明「自定义已完成任务在应用中的显示方式」／三档「淡化」「删除线」「无」。
 */
describe('已完成任务的外观（G160）', () => {
  it('官方三档标签与标题/说明逐字', () => {
    expect(COMPLETED_TASK_APPEARANCE_TITLE).toBe('完成任务的外观');
    expect(COMPLETED_TASK_APPEARANCE_DESC).toBe('自定义已完成任务在应用中的显示方式');
    expect(COMPLETED_TASK_APPEARANCE_LABELS).toEqual({ faded: '淡化', strike: '删除线', none: '无' });
  });

  it('三档各自给出对应类名：删除线带 line-through、淡化只弱化、无则原样', () => {
    expect(completedTaskClasses('strike')).toBe('text-muted-foreground line-through');
    expect(completedTaskClasses('faded')).toBe('text-muted-foreground');
    expect(completedTaskClasses('none')).toBe('');
  });

  it('认不出的值一律退回默认档（删除线）——旧数据与空值都不会把行渲染成"没有外观"', () => {
    for (const bad of [undefined, null, '', 'STRIKE', 42, {}]) {
      expect(normalizeCompletedTaskAppearance(bad)).toBe('strike');
      expect(completedTaskClasses(bad)).toBe('text-muted-foreground line-through');
    }
  });

  it('从本机 user 镜像里挑本人那一行（按 userId 当主键；墓碑行不算）', () => {
    const rows = [
      { id: 'u-other', data: { completedTaskAppearance: 'none' } },
      { id: 'u-me', data: { completedTaskAppearance: 'faded' } },
    ];
    expect(appearanceFromUserRows(rows, 'u-me')).toBe('faded');
    // 没登录 / 镜像里还没有本人那一行 ⇒ 默认档
    expect(appearanceFromUserRows(rows, undefined)).toBe('strike');
    expect(appearanceFromUserRows([], 'u-me')).toBe('strike');
    // 本人的行被标了墓碑 ⇒ 当没有偏好，走默认档
    expect(appearanceFromUserRows([{ id: 'u-me', op: 'delete', data: { completedTaskAppearance: 'none' } }], 'u-me')).toBe('strike');
  });
});
