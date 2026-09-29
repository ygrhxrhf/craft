import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/auth/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }));

import { getDb } from '@/prisma/db';
import { getOrCreateTodayNote } from './daily-notes';

function mockDb() {
  const create = vi.fn(async (_data?: Record<string, unknown>) => ({ id: 'new-doc' }));
  const emitCreate = vi.fn(async (_data?: Record<string, unknown>) => ({}));
  const all = vi.fn(async () => []);
  const first = vi.fn(async () => null);
  const chain = { where: () => chain, limit: () => chain, all, first, create };
  // I2：SyncEvent 与业务模型分流，避免 emit 计入业务 create
  (getDb as any).mockResolvedValue({
    orm: { public: new Proxy({}, { get: (_t: object, m: string) => (m === 'SyncEvent' ? { create: emitCreate } : chain) }) },
  });
  return { create, emitCreate };
}

describe('getOrCreateTodayNote metaUpdatedAt（R-15：新建行须进增量同步）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('新建日记行显式带 metaUpdatedAt，并 emit 广播', async () => {
    const db = mockDb();
    await getOrCreateTodayNote();
    expect(db.create).toHaveBeenCalledTimes(1);
    const arg = db.create.mock.calls[0]![0]!;
    expect(arg.metaUpdatedAt).toEqual(expect.any(String));
    // I2：新建文档行落库后广播（tables=document）
    expect(db.emitCreate).toHaveBeenCalledTimes(1);
    expect(db.emitCreate.mock.calls[0]![0]!.tables).toEqual(['document']);
  });
});
