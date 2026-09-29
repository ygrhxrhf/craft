import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  getTable: vi.fn(),
  assertOwned: vi.fn(),
}));

import { getTable } from '@/lib/authz/guard';
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
