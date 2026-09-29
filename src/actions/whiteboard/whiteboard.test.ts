import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  getTable: vi.fn(),
  assertOwned: vi.fn(),
}));
vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));

import { getTable } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { createWhiteboard, deleteWhiteboard, saveWhiteboardData } from './whiteboard';

describe('createWhiteboard metaUpdatedAt（T4 缺口：新行须进增量同步）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('新建白板行显式带 metaUpdatedAt', async () => {
    const create = vi.fn(async (_data?: Record<string, unknown>) => ({}));
    (getTable as any).mockResolvedValue({ create });
    await createWhiteboard('画板');
    expect(create).toHaveBeenCalledTimes(1);
    const arg = create.mock.calls[0]![0]!;
    expect(arg.metaUpdatedAt).toEqual(expect.any(String));
  });
});

describe('deleteWhiteboard metaUpdatedAt（R-15：删除须进增量同步）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('删除白板 bump metaUpdatedAt', async () => {
    const update = vi.fn(async (_data?: Record<string, unknown>) => ({}));
    (getTable as any).mockResolvedValue({ where: () => ({ update }) });
    await deleteWhiteboard('wb1');
    expect(update).toHaveBeenCalledTimes(1);
    const arg = update.mock.calls[0]![0]!;
    expect(arg.isDeleted).toBe(true);
    expect(arg.deletedAt).toEqual(expect.any(String));
    expect(arg.metaUpdatedAt).toEqual(expect.any(String));
  });

  it('保存 .data 不 bump metaUpdatedAt（内容不属元数据）', async () => {
    const update = vi.fn(async (_data?: Record<string, unknown>) => ({}));
    (getTable as any).mockResolvedValue({ where: () => ({ update }) });
    await saveWhiteboardData('wb1', { shapes: [] });
    const arg = update.mock.calls[0]![0]!;
    expect(arg).not.toHaveProperty('metaUpdatedAt');
  });
});

describe('deleteWhiteboard emit sync_events（R-17 选定 server emit）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('删除白板同动作广播 sync_events（tables=[whiteboard]）', async () => {
    const update = vi.fn(async (_data?: Record<string, unknown>) => ({}));
    (getTable as any).mockResolvedValue({ where: () => ({ update }) });
    const emitCreate = vi.fn(async (_data?: Record<string, unknown>) => ({}));
    (getDb as any).mockResolvedValue({
      orm: { public: new Proxy({}, { get: (_t, m: string) => (m === 'SyncEvent' ? { create: emitCreate } : {}) }) },
    });
    await deleteWhiteboard('wb1');
    expect(emitCreate).toHaveBeenCalledTimes(1);
    const arg = emitCreate.mock.calls[0]![0]!;
    expect(arg.tables).toEqual(['whiteboard']);
    expect(arg.userId).toBe('u1');
  });

  it('emit 失败不阻断删除', async () => {
    const update = vi.fn(async (_data?: Record<string, unknown>) => ({}));
    (getTable as any).mockResolvedValue({ where: () => ({ update }) });
    (getDb as any).mockRejectedValue(new Error('db down'));
    await expect(deleteWhiteboard('wb1')).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
