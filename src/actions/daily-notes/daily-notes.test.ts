import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/auth/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }));

import { getDb } from '@/prisma/db';
import { getOrCreateTodayNote } from './daily-notes';

function mockDb() {
  const create = vi.fn(async (_data?: Record<string, unknown>) => ({ id: 'new-doc' }));
  const all = vi.fn(async () => []);
  const first = vi.fn(async () => null);
  const chain = { where: () => chain, limit: () => chain, all, first, create };
  (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, { get: () => chain }) } });
  return { create };
}

describe('getOrCreateTodayNote metaUpdatedAt（R-15：新建行须进增量同步）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('新建日记行显式带 metaUpdatedAt', async () => {
    const db = mockDb();
    await getOrCreateTodayNote();
    expect(db.create).toHaveBeenCalledTimes(1);
    const arg = db.create.mock.calls[0]![0]!;
    expect(arg.metaUpdatedAt).toEqual(expect.any(String));
  });
});
