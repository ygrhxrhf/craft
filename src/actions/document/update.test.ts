import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/authz/guard', () => ({ requireUserId: vi.fn(async () => 'u1') }));
vi.mock('@/lib/authz/document-access', () => ({ requireDocumentAccess: vi.fn(async () => true) }));

import { getDb } from '@/prisma/db';
import { updateDocument } from './update';

function mockDb() {
  const update = vi.fn(async (_data?: Record<string, unknown>) => ({} as Record<string, unknown>));
  const create = vi.fn(async (_data?: Record<string, unknown>) => ({}));
  const first = vi.fn(async () => null);
  const all = vi.fn(async () => []);
  const chain = { where: () => chain, update, create, first, all,
    orderBy: () => chain, limit: () => chain };
  (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
    get: (_t, m: string) => m === 'SyncEvent' ? { create } : chain,
  }) } });
  return { update, create, first, all };
}

describe('updateDocument 字段白名单（spec 4.2/5.6）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('正文保存不写 metaUpdatedAt、不发 sync_events', async () => {
    const db = mockDb();
    await updateDocument('doc1', { content: [{ type: 'p' }], plainText: 'hi', wordCount: 2, charCount: 2 });
    const arg = db.update.mock.calls[0]![0]!;
    expect(arg).not.toHaveProperty('metaUpdatedAt');
    expect(db.create).not.toHaveBeenCalled();      // 不 emit
  });

  it('元数据保存写 metaUpdatedAt 并 emit sync_events', async () => {
    const db = mockDb();
    await updateDocument('doc1', { title: '新标题' });
    const arg = db.update.mock.calls[0]![0]!;
    expect(arg.metaUpdatedAt).toEqual(expect.any(String));
    expect(db.create).toHaveBeenCalledTimes(1);    // emit
  });
});
