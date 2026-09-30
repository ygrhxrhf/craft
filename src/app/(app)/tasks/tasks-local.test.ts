import { describe, it, expect } from 'vitest';
import { taskPatchFor, TASK_WS_COLS } from './tasks-local';

const NOW = '2026-09-30T00:00:00.000Z';

describe('tasks 本地写 patch', () => {
  it('白名单与 SYNC_TABLES.task 的 16 列一致', () => {
    expect([...TASK_WS_COLS].sort()).toEqual([
      'blockId', 'completedAt', 'createdAt', 'deletedAt', 'documentId', 'dueDate',
      'id', 'isCompleted', 'order', 'recurrence', 'recurrenceEnd', 'remindAt',
      'status', 'title', 'updatedAt', 'userId',
    ]);
  });

  it('新建：只写创建必需列 + updatedAt', () => {
    const p = taskPatchFor.create({ id: 't1', userId: 'u1', title: '买牛奶' }, NOW);
    expect(Object.keys(p).sort()).toEqual(['createdAt', 'id', 'isCompleted', 'status', 'title', 'updatedAt', 'userId']);
    expect(p.isCompleted).toBe(false);
    expect(p.status).toBe('todo');
  });

  it('新建：带 dueDate 时才出现该列（不写 undefined 占位）', () => {
    expect(taskPatchFor.create({ id: 't1', userId: 'u1', title: 'x', dueDate: NOW }, NOW).dueDate).toBe(NOW);
    expect(Object.keys(taskPatchFor.create({ id: 't1', userId: 'u1', title: 'x' }, NOW)))
      .not.toContain('dueDate');
  });

  it('改期：只动四个日程列 + updatedAt', () => {
    const p = taskPatchFor.schedule(
      { dueDate: '2026-10-01T09:00:00.000Z', remindAt: null, recurrence: null, recurrenceEnd: null },
      NOW,
    );
    expect(Object.keys(p).sort()).toEqual(['dueDate', 'recurrence', 'recurrenceEnd', 'remindAt', 'updatedAt']);
  });

  it('标题两端去空白（与服务端 createTask 的 trim 同形）', () => {
    expect(taskPatchFor.create({ id: 't1', userId: 'u1', title: '  买牛奶  ' }, NOW).title).toBe('买牛奶');
  });

  it('所有产出键都在白名单内（本地 store 无 def.cols 闸门，客户端必须自己挡）', () => {
    const allowed = new Set<string>(TASK_WS_COLS);
    const patches = [
      taskPatchFor.create({ id: 't1', userId: 'u1', title: 'x' }, NOW),
      taskPatchFor.schedule({ dueDate: null, remindAt: null, recurrence: null, recurrenceEnd: null }, NOW),
    ];
    for (const p of patches) for (const k of Object.keys(p)) expect(allowed.has(k)).toBe(true);
  });
});
