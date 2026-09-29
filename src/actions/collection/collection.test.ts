// src/actions/collection/collection.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/auth/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'u1' } })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getDb } from '@/prisma/db';
import { createCollection, updateCollection, deleteCollection } from './collection';

type Row = Record<string, unknown>;

function setupDb(existing: Row | null) {
  const emitCreate = vi.fn(async (_data?: Record<string, unknown>) => ({}));
  const create = vi.fn(async (data: Row) => data);
  const update = vi.fn(async (data: Row) => data);
  const table = {
    first: vi.fn(async () => existing),
    where: () => ({ update }),
    create,
  };
  (getDb as any).mockResolvedValue({
    orm: { public: {
      Collection: table,
      CollectionView: { create },
      CollectionProperty: { create },
      SyncEvent: { create: emitCreate },
    } },
  });
  return { emitCreate, create, update };
}

describe('I2：集合元数据写入后 emit sync_events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createCollection → emit（tables 含 collection）', async () => {
    const { emitCreate } = setupDb(null);
    await createCollection({ name: '新集合' });
    expect(emitCreate).toHaveBeenCalledTimes(1);
    const arg = emitCreate.mock.calls[0]![0]!;
    expect(arg.tables).toContain('collection');
    expect(arg.userId).toBe('u1');
    expect(typeof arg.cursor).toBe('string');
  });

  it('updateCollection → emit（tables=collection）', async () => {
    const { emitCreate } = setupDb({ id: 'c1', userId: 'u1' });
    await updateCollection('c1', { name: '改名' });
    expect(emitCreate).toHaveBeenCalledTimes(1);
    expect(emitCreate.mock.calls[0]![0]!.tables).toEqual(['collection']);
  });

  it('deleteCollection → emit（软删墓碑同样广播）', async () => {
    const { emitCreate } = setupDb({ id: 'c1', userId: 'u1' });
    await deleteCollection('c1');
    expect(emitCreate).toHaveBeenCalledTimes(1);
    expect(emitCreate.mock.calls[0]![0]!.tables).toEqual(['collection']);
  });

  it('集合不存在 → 抛错且不 emit', async () => {
    const { emitCreate } = setupDb(null);
    await expect(updateCollection('missing', { name: 'x' })).rejects.toThrow();
    expect(emitCreate).not.toHaveBeenCalled();
  });
});
