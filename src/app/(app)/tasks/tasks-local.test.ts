import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/sync-core', () => ({ getSyncManager: vi.fn() }));

import { getSyncManager } from '@/lib/sync-core';
import { SYNC_TABLES } from '@/lib/sync/tables';
import { overlayTaskRows, taskItemsFromMirror, taskPatchFor, toggleTaskLocally, TASK_WS_COLS } from './tasks-local';
import type { PendingRow } from '@/components/sync/local-records';
import type { TaskItem } from '@/actions/task/task';

const NOW = '2026-09-30T00:00:00.000Z';

describe('tasks 本地写 patch', () => {
  it('白名单与 SYNC_TABLES.task 的 19 列一致', () => {
    expect([...TASK_WS_COLS].sort()).toEqual([
      'blockId', 'cancelledAt', 'completedAt', 'createdAt', 'deletedAt', 'documentId', 'dueDate',
      'id', 'isCompleted', 'order', 'recurrence', 'recurrenceEnd', 'remindAt', 'scheduleDate',
      'seriesId', 'status', 'title', 'updatedAt', 'userId',
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
  seriesId: null,
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
    expect(only.seriesId).toBeNull();
  });
});

describe('taskItemsFromMirror：断链时的读侧镜像', () => {
  const mirrorTask = (id: string, data: Record<string, unknown>) => ({ id, op: 'upsert', data });

  it('把同步列投影成 TaskItem，并补上宿主文档标题', () => {
    const items = taskItemsFromMirror(
      [mirrorTask('t1', {
        title: '买牛奶',
        isCompleted: true,
        status: 'done',
        dueDate: '2026-10-01T09:00:00.000Z',
        seriesId: 's1',
        documentId: 'd1',
        createdAt: '2026-09-30T00:00:00.000Z',
      })],
      [{ id: 'd1', op: 'upsert', data: { title: '文档甲', isDeleted: false, isDailyNote: true } }],
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 't1', title: '买牛奶', isCompleted: true, status: 'done', seriesId: 's1',
      documentId: 'd1', documentTitle: '文档甲', isDailyNote: true,
    });
  });

  it('墓碑行与已删宿主文档里的任务都不进列表（与 getTasksPage 同一条过滤）', () => {
    const items = taskItemsFromMirror(
      [
        mirrorTask('gone', { title: '已删', deletedAt: NOW }),
        mirrorTask('orphan', { title: '宿主进了回收站', documentId: 'd-gone' }),
        mirrorTask('keep', { title: '无宿主任务' }),
      ],
      [{ id: 'd-gone', op: 'upsert', data: { title: '回收站里', isDeleted: true } }],
    );

    expect(items.map((task) => task.id)).toEqual(['keep']);
  });

  it('按 (createdAt, id) 递减，与 getTasksPage 的页序同口径', () => {
    const items = taskItemsFromMirror(
      [
        mirrorTask('old', { createdAt: '2026-09-01T00:00:00.000Z' }),
        mirrorTask('new', { createdAt: '2026-09-30T00:00:00.000Z' }),
        mirrorTask('same-a', { createdAt: '2026-09-15T00:00:00.000Z' }),
        mirrorTask('same-b', { createdAt: '2026-09-15T00:00:00.000Z' }),
      ],
    );

    expect(items.map((task) => task.id)).toEqual(['new', 'same-b', 'same-a', 'old']);
  });

  it('delete op 的镜像行不投影（applyLocal 的删除意图已由 overlay 处理）', () => {
    const items = taskItemsFromMirror([
      mirrorTask('t1', { title: '活着' }),
      { id: 't2', op: 'delete' },
    ]);

    expect(items.map((task) => task.id)).toEqual(['t1']);
  });
});

describe('toggleTaskLocally：离线勾选', () => {
  type Applied = { table: string; id: string; patch: Record<string, unknown> | null };

  function manager() {
    const applyLocal = vi.fn(async (_rec: Applied): Promise<void> => {});
    (getSyncManager as any).mockReturnValue({ applyLocal, flushNow: vi.fn(async () => {}) });
    return applyLocal;
  }

  const TOGGLE_NOW = new Date('2030-05-01T12:00:00.000Z');

  it('待办 → 完成：先落四列，再落下一期新行（两笔都进 task 队列）', async () => {
    const applyLocal = manager();
    const done = await toggleTaskLocally(
      task({ id: 't1', dueDate: '2030-05-01T00:00:00.000Z', recurrence: '{"freq":"daily","type":"fixed"}' }),
      'u1',
      { now: TOGGLE_NOW, timeZone: 'UTC' },
    );

    expect(done).toBe(true);
    expect(applyLocal).toHaveBeenCalledTimes(2);
    expect(applyLocal.mock.calls[0]![0]).toMatchObject({
      table: 'task',
      id: 't1',
      patch: { isCompleted: true, status: 'done', completedAt: TOGGLE_NOW.toISOString(), updatedAt: TOGGLE_NOW.toISOString() },
    });
    const next = applyLocal.mock.calls[1]![0];
    expect(next.table).toBe('task');
    expect(next.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(next.patch).toMatchObject({
      id: next.id,
      userId: 'u1',
      dueDate: '2030-05-02T00:00:00.000Z',
      seriesId: 't1',
      status: 'todo',
    });
  });

  it('没有重复规则 → 只落一笔（不派生下一期）', async () => {
    const applyLocal = manager();
    await toggleTaskLocally(task({ id: 't1' }), 'u1', { now: TOGGLE_NOW, timeZone: 'UTC' });

    expect(applyLocal).toHaveBeenCalledTimes(1);
  });

  it('取消勾选已完成行 → 只落一笔，且不带 completedAt', async () => {
    const applyLocal = manager();
    const done = await toggleTaskLocally(
      task({ id: 't1', isCompleted: true, status: 'done', recurrence: '{"freq":"daily","type":"fixed"}', dueDate: TOGGLE_NOW.toISOString() }),
      'u1',
      { now: TOGGLE_NOW, timeZone: 'UTC' },
    );

    expect(done).toBe(false);
    expect(applyLocal).toHaveBeenCalledTimes(1);
    expect(applyLocal.mock.calls[0]![0].patch).toMatchObject({ isCompleted: false, completedAt: null });
  });

  it('两笔 patch 的键全部落在 SYNC_TABLES.task 的列白名单内', async () => {
    const applyLocal = manager();
    await toggleTaskLocally(
      task({ id: 't1', dueDate: '2030-05-01T00:00:00.000Z', recurrence: '{"freq":"daily","type":"fixed"}', documentId: 'd1', blockId: 'b1' }),
      'u1',
      { now: TOGGLE_NOW, timeZone: 'UTC' },
    );
    const cols = SYNC_TABLES.find((def) => def.table === 'task')!.cols;
    for (const call of applyLocal.mock.calls) {
      for (const key of Object.keys(call[0].patch ?? {})) expect(cols).toContain(key);
    }
  });
});
