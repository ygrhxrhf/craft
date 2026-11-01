import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/auth/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'u1' } })),
}));
vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
}));
vi.mock('@/lib/authz/document-access', () => ({
  requireDocumentAccess: vi.fn(async () => ({
    document: { id: 'd1', userId: 'u1' },
    role: 'owner',
  })),
}));

import { getDb } from '@/prisma/db';
import { getTasks, syncDocumentTasks, createTask, toggleTask } from './task';

type Row = Record<string, unknown>;
type Log = { updates: { conds: Row[]; data: Row }[]; creates: Row[] };

/** 真实 where 语义的最小实现：`{ k: null }` → IS NULL，其余等值匹配。 */
function matchRow(row: Row, cond: Row) {
  return Object.entries(cond).every(([k, v]) => (v === null ? row[k] == null : row[k] === v));
}

/** 可链式 where().orderBy().limit().all() / where().update() 的最小表 mock。 */
type Query = {
  where: (cond: Row) => Query;
  orderBy: () => Query;
  limit: () => Query;
  all: () => Promise<Row[]>;
  first: () => Promise<Row | null>;
  update: (data: Row) => Promise<Row>;
};

function taskTable(rows: Row[], log: Log) {
  const chain = (conds: Row[]): Query => {
    const scoped = rows.filter((row) => conds.every((cond) => matchRow(row, cond)));
    const q: Query = {
      where: (cond) => chain([...conds, cond]),
      orderBy: () => q,
      limit: () => q,
      all: async () => scoped,
      first: async () => scoped[0] ?? null,
      update: async (data) => {
        log.updates.push({ conds, data });
        return data;
      },
    };
    return q;
  };
  return {
    where: (cond: Row) => chain([cond]),
    first: (cond: Row) => chain([cond]).first(),
    create: async (data: Row) => {
      log.creates.push(data);
      return data;
    },
  };
}

function setupDb(rows: Row[]) {
  const log: Log = { updates: [], creates: [] };
  const emitCreate = vi.fn(async (_data?: Record<string, unknown>) => ({}));
  (log as any).emit = emitCreate;
  (getDb as any).mockResolvedValue({
    orm: { public: { Task: taskTable(rows, log), SyncEvent: { create: emitCreate } } },
  });
  return log;
}

const liveTask: Row = {
  id: 'live',
  userId: 'u1',
  documentId: null,
  blockId: null,
  title: '活任务',
  isCompleted: false,
  dueDate: null,
  remindAt: null,
  recurrence: null,
  recurrenceEnd: null,
  deletedAt: null,
};

const tombstonedTask: Row = {
  id: 'dead',
  userId: 'u1',
  documentId: null,
  blockId: null,
  title: '已删任务',
  isCompleted: false,
  dueDate: null,
  remindAt: null,
  recurrence: null,
  recurrenceEnd: null,
  deletedAt: '2026-09-28T00:00:00.000Z',
};

describe('读侧墓碑过滤（C-1）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getTasks 不返回带 deletedAt 的任务行', async () => {
    setupDb([liveTask, tombstonedTask]);
    const tasks = await getTasks();
    expect(tasks.map((task) => task.id)).toEqual(['live']);
  });
});

describe('syncDocumentTasks 墓碑语义（C-2）', () => {
  beforeEach(() => vi.clearAllMocks());

  const docScopedTombstone: Row = {
    id: 't1',
    userId: 'u1',
    documentId: 'd1',
    blockId: 'b1',
    title: '块任务',
    isCompleted: false,
    deletedAt: '2026-09-28T00:00:00.000Z',
  };

  it('已墓碑且 block 不在 incoming → 跳过，不重写墓碑（无 updatedAt 抖动）', async () => {
    const log = setupDb([docScopedTombstone]);
    await syncDocumentTasks('d1', []);
    expect(log.updates).toEqual([]);
    expect(log.creates).toEqual([]);
  });

  it('block 重新出现且命中墓碑行 → 清墓碑复活，不新建行', async () => {
    const log = setupDb([docScopedTombstone]);
    await syncDocumentTasks('d1', [
      { taskId: 'b1', title: '块任务', isCompleted: false },
    ]);
    expect(log.updates).toHaveLength(1);
    expect(log.updates[0]!.conds).toEqual([{ id: 't1' }]);
    expect(log.updates[0]!.data).toMatchObject({
      deletedAt: null,
      title: '块任务',
      isCompleted: false,
      status: 'todo',
    });
    expect(log.creates).toEqual([]);
  });
});

describe('I2：元数据写入后 emit sync_events', () => {
  beforeEach(() => vi.clearAllMocks());

  const docScopedTombstone: Row = {
    id: 't1',
    userId: 'u1',
    documentId: 'd1',
    blockId: 'b1',
    title: '块任务',
    isCompleted: false,
    deletedAt: '2026-09-28T00:00:00.000Z',
  };

  it('syncDocumentTasks 有变更 → 每保存批次只 emit 一次（tables=task）', async () => {
    const log = setupDb([docScopedTombstone]);
    await syncDocumentTasks('d1', [
      { taskId: 'b1', title: '块任务', isCompleted: false },
    ]);
    const emitCreate = (log as any).emit;
    expect(emitCreate).toHaveBeenCalledTimes(1); // 复活 1 行 + 新增 1 行也只发一次
    const arg = emitCreate.mock.calls[0]![0]!;
    expect(arg.tables).toEqual(['task']);
    expect(arg.userId).toBe('u1');
    expect(typeof arg.cursor).toBe('string');
  });

  it('syncDocumentTasks 无变更 → 不 emit', async () => {
    const log = setupDb([docScopedTombstone]);
    await syncDocumentTasks('d1', []);
    expect((log as any).emit).not.toHaveBeenCalled();
  });

  it('createTask → emit（tables=task）', async () => {
    const log = setupDb([]);
    await createTask('新任务');
    const emitCreate = (log as any).emit;
    expect(emitCreate).toHaveBeenCalledTimes(1);
    expect(emitCreate.mock.calls[0]![0]!.tables).toEqual(['task']);
  });
});

const CANCEL_AT = '2026-10-14T02:00:00.000Z';

/**
 * `gap.md` G52：正文里的 `cancelled` 是同一枚轴上的第三档，行侧要投影成 `status='cancelled'`
 * 且带着自己的时间戳；勾与取消同时为真时取消说了算（`tasks.md:11`）。
 * 这里钉的是**投影与比较**，状态机本身在 `src/lib/editor/task-status.test.ts`。
 */
describe('取消档的投影（G52）', () => {
  beforeEach(() => vi.clearAllMocks());

  const inDocRow: Row = {
    id: 't1',
    userId: 'u1',
    documentId: 'd1',
    blockId: 'b1',
    title: '块任务',
    isCompleted: false,
    status: 'todo',
    cancelledAt: null,
    remindAt: null,
    deletedAt: null,
  };

  it('正文标了取消 → 新行写 status=cancelled，且不算完成', async () => {
    const log = setupDb([]);
    await syncDocumentTasks('d1', [
      { taskId: 'b9', title: '交报告', isCompleted: false, cancelled: true, cancelledAt: CANCEL_AT },
    ]);
    expect(log.creates[0]).toMatchObject({
      isCompleted: false,
      status: 'cancelled',
      cancelledAt: CANCEL_AT,
    });
  });

  it('取消优先于勾：正文两枚都真时不许投影成 done', async () => {
    const log = setupDb([]);
    await syncDocumentTasks('d1', [
      { taskId: 'b9', title: '交报告', isCompleted: true, cancelled: true, cancelledAt: CANCEL_AT },
    ]);
    expect(log.creates[0]).toMatchObject({ isCompleted: false, status: 'cancelled' });
  });

  it('只动取消轴也算变更（比较谓词漏了 status 就会同步后悄悄退回待办）', async () => {
    const log = setupDb([inDocRow]);
    await syncDocumentTasks('d1', [
      { taskId: 'b1', title: '块任务', isCompleted: false, cancelled: true, cancelledAt: CANCEL_AT },
    ]);
    expect(log.updates).toHaveLength(1);
    expect(log.updates[0]!.data).toMatchObject({
      status: 'cancelled',
      cancelledAt: CANCEL_AT,
      isCompleted: false,
    });
  });

  it('取消行重新勾成完成 → 上一次取消时间戳必须清掉', async () => {
    const log = setupDb([{ ...inDocRow, status: 'cancelled', cancelledAt: CANCEL_AT }]);
    await syncDocumentTasks('d1', [
      { taskId: 'b1', title: '块任务', isCompleted: true, cancelled: false, cancelledAt: CANCEL_AT },
    ]);
    expect(log.updates[0]!.data).toMatchObject({ status: 'done', cancelledAt: null, isCompleted: true });
  });

  it('没取消的行投影出 cancelledAt=null（旧时间戳不许留在列上）', async () => {
    const log = setupDb([{ ...inDocRow, title: '旧标题' }]);
    await syncDocumentTasks('d1', [{ taskId: 'b1', title: '块任务', isCompleted: false }]);
    expect(log.updates[0]!.data).toMatchObject({ status: 'todo', cancelledAt: null });
  });
});

describe('勾选框那一次点击走三值循环（tasks.md:12）', () => {
  beforeEach(() => vi.clearAllMocks());

  const row = (over: Row): Row => ({
    id: 't1',
    userId: 'u1',
    documentId: null,
    blockId: null,
    title: '任务',
    isCompleted: false,
    status: 'todo',
    cancelledAt: null,
    remindAt: null,
    recurrence: null,
    deletedAt: null,
    ...over,
  });

  it('待办 → 完成', async () => {
    const log = setupDb([row({})]);
    const completed = await toggleTask('t1');
    expect(completed).toBe(true);
    expect(log.updates[0]!.data).toMatchObject({ isCompleted: true, status: 'done', cancelledAt: null });
  });

  it('★ 已取消 → 待办：不是完成，也不留下上一次的取消时间戳', async () => {
    const log = setupDb([row({ status: 'cancelled', cancelledAt: CANCEL_AT })]);
    const completed = await toggleTask('t1');
    expect(completed).toBe(false);
    expect(log.updates[0]!.data).toMatchObject({
      isCompleted: false,
      status: 'todo',
      cancelledAt: null,
    });
  });
});

describe('读侧三档排序（G52）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('待办在前，完成与取消都算退场；status 与 cancelledAt 一并交给行侧', async () => {
    setupDb([
      { id: 'done', userId: 'u1', documentId: null, blockId: null, title: '完成', isCompleted: true, status: 'done', cancelledAt: null, deletedAt: null },
      { id: 'dead', userId: 'u1', documentId: null, blockId: null, title: '取消', isCompleted: false, status: 'cancelled', cancelledAt: CANCEL_AT, deletedAt: null },
      { id: 'live', userId: 'u1', documentId: null, blockId: null, title: '待办', isCompleted: false, status: 'todo', cancelledAt: null, deletedAt: null },
    ]);
    const tasks = await getTasks();
    expect(tasks.map((task) => task.id)).toEqual(['live', 'done', 'dead']);
    const dead = tasks.find((task) => task.id === 'dead');
    expect(dead).toMatchObject({ status: 'cancelled', cancelledAt: CANCEL_AT, isCompleted: false });
  });
});

describe('task page cursors (G604)', () => {
  it('round-trips a (createdAt, id) cursor', async () => {
    // G604 的编解码住在纯核里：`actions/task/task.ts` 是 `'use server'`，只许导出 async 函数，
    // 两枚同步导出会让整个模块编译失败（`Server Actions must be async functions`）。
    const { encodeTaskCursor, decodeTaskCursor } = await import('@/lib/task/task-paging');
    const cursor = encodeTaskCursor({ createdAt: '2026-01-01T00:00:00.000Z', id: 'abc' });
    expect(cursor).toBe('2026-01-01T00:00:00.000Z|abc');
    expect(decodeTaskCursor(cursor)).toEqual({ createdAt: '2026-01-01T00:00:00.000Z', id: 'abc' });
  });

  it('getTasks is the first page and getTasksPage accepts a cursor', async () => {
    const mod = await import('./task');
    expect(typeof mod.getTasks).toBe('function');
    expect(typeof mod.getTasksPage).toBe('function');
  });
});
