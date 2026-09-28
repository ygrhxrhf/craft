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
import { getTasks, syncDocumentTasks } from './task';

type Row = Record<string, unknown>;
type Log = { updates: { conds: Row[]; data: Row }[]; creates: Row[] };

/** 真实 where 语义的最小实现：`{ k: null }` → IS NULL，其余等值匹配。 */
function matchRow(row: Row, cond: Row) {
  return Object.entries(cond).every(([k, v]) => (v === null ? row[k] == null : row[k] === v));
}

/** 可链式 where().orderBy().limit().all() / where().update() 的最小表 mock。 */
function taskTable(rows: Row[], log: Log) {
  const chain = (conds: Row[]) => {
    const scoped = rows.filter((row) => conds.every((cond) => matchRow(row, cond)));
    const q: Record<string, unknown> = {};
    q.where = (cond: Row) => chain([...conds, cond]);
    q.orderBy = () => q;
    q.limit = () => q;
    q.all = async () => scoped;
    q.update = async (data: Row) => {
      log.updates.push({ conds, data });
      return data;
    };
    return q;
  };
  return {
    where: (cond: Row) => chain([cond]),
    create: async (data: Row) => {
      log.creates.push(data);
      return data;
    },
  };
}

function setupDb(rows: Row[]) {
  const log: Log = { updates: [], creates: [] };
  (getDb as any).mockResolvedValue({
    orm: { public: { Task: taskTable(rows, log) } },
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
