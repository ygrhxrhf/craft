import { describe, it, expect } from 'vitest';
import { overlayTaskRows, taskPatchFor, TASK_WS_COLS } from './tasks-local';
import type { PendingRow } from '@/components/sync/local-records';
import type { TaskItem } from '@/actions/task/task';

const NOW = '2026-09-30T00:00:00.000Z';

describe('tasks 本地写 patch', () => {
  it('白名单与 SYNC_TABLES.task 的 18 列一致', () => {
    expect([...TASK_WS_COLS].sort()).toEqual([
      'blockId', 'cancelledAt', 'completedAt', 'createdAt', 'deletedAt', 'documentId', 'dueDate',
      'id', 'isCompleted', 'order', 'recurrence', 'recurrenceEnd', 'remindAt', 'scheduleDate',
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
      { dueDate: '2026-10-01T09:00:00.000Z', scheduleDate: '2026-10-02T09:00:00.000Z', remindAt: null, recurrence: null, recurrenceEnd: null },
      NOW,
    );
    expect(Object.keys(p).sort()).toEqual(['dueDate', 'recurrence', 'recurrenceEnd', 'remindAt', 'scheduleDate', 'updatedAt']);
  });

  it('标题两端去空白（与服务端 createTask 的 trim 同形）', () => {
    expect(taskPatchFor.create({ id: 't1', userId: 'u1', title: '  买牛奶  ' }, NOW).title).toBe('买牛奶');
  });

  it('所有产出键都在白名单内（本地 store 无 def.cols 闸门，客户端必须自己挡）', () => {
    const allowed = new Set<string>(TASK_WS_COLS);
    const patches = [
      taskPatchFor.create({ id: 't1', userId: 'u1', title: 'x' }, NOW),
      taskPatchFor.schedule({ dueDate: null, scheduleDate: null, remindAt: null, recurrence: null, recurrenceEnd: null }, NOW),
    ];
    for (const p of patches) for (const k of Object.keys(p)) expect(allowed.has(k)).toBe(true);
  });
});

const task = (over: Partial<TaskItem> & { id: string }): TaskItem => ({
  title: '任务',
  isCompleted: false,
  status: 'todo',
  cancelledAt: null,
  dueDate: null,
  scheduleDate: null,
  remindAt: null,
  recurrence: null,
  recurrenceEnd: null,
  documentId: null,
  blockId: null,
  documentTitle: null,
  ...over,
});

const pendingOf = (entries: Array<[string, PendingRow]>) => new Map(entries);

describe('overlayTaskRows：服务端行 + 未推送意图', () => {
  it('本地删除的 op 让那一行从视图里消失（断链时这正是服务端还在的那一行）', () => {
    const rows = [task({ id: 'a', title: '甲' }), task({ id: 'b', title: '乙' })];
    const pending = pendingOf([['a', { op: 'delete', syncTs: NOW }]]);

    expect(overlayTaskRows(rows, pending).map((t) => t.id)).toEqual(['b']);
  });

  it('本地新建的行出现在视图里，即使服务端还没有它', () => {
    const pending = pendingOf([
      ['new', { op: 'upsert', syncTs: NOW, data: { id: 'new', title: '刚建的', createdAt: NOW } }],
    ]);

    const [only] = overlayTaskRows([], pending);
    expect(only.id).toBe('new');
    expect(only.title).toBe('刚建的');
    expect(only.status).toBe('todo');
  });

  it('本地改过的标题盖住服务端的旧标题', () => {
    const rows = [task({ id: 'a', title: '旧标题' })];
    const pending = pendingOf([['a', { op: 'upsert', syncTs: NOW, data: { title: '新标题' } }]]);

    expect(overlayTaskRows(rows, pending)[0].title).toBe('新标题');
  });

  it('已取消／已完成的行留在视图里（露不露由「显示已完成」开关决定）', () => {
    const rows = [
      task({ id: 'a' }),
      task({ id: 'b', status: 'done', isCompleted: true }),
      task({ id: 'c', status: 'cancelled', cancelledAt: NOW }),
    ];

    expect(overlayTaskRows(rows, new Map()).map((t) => t.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('带 deletedAt 的镜像行按墓碑滤掉（外部推送来的软删）', () => {
    const rows = [task({ id: 'a' }), { ...task({ id: 'b' }), deletedAt: NOW } as TaskItem];

    expect(overlayTaskRows(rows, new Map()).map((t) => t.id)).toEqual(['a']);
  });

  it('排序重做：pending 在前，与 getTasks 同一口径（本地新行不会落在末尾）', () => {
    const rows = [task({ id: 'done', status: 'done', isCompleted: true }), task({ id: 'todo' })];
    const pending = pendingOf([
      ['fresh', { op: 'upsert', syncTs: NOW, data: { id: 'fresh', title: '新的' } }],
    ]);

    const live = overlayTaskRows(rows, pending);
    expect(live.map((t) => t.id)).toEqual(['todo', 'fresh', 'done']);
  });

  it('pending 载荷缺字段时用骨架补齐，不产出 undefined 列', () => {
    const pending = pendingOf([['bare', { op: 'upsert', syncTs: NOW, data: { id: 'bare' } }]]);

    const [only] = overlayTaskRows([], pending);
    expect(only.title).toBe('');
    expect(only.cancelledAt).toBeNull();
    expect(only.documentId).toBeNull();
  });
});
