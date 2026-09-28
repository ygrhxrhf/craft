import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/authz/guard', () => ({ requireUserId: vi.fn(async () => 'u1') }));
vi.mock('@/lib/authz/document-access', () => ({
  requireDocumentAccess: vi.fn(async () => ({
    document: { id: 'd1', userId: 'u1' },
    role: 'viewer',
  })),
}));

import { getDb } from '@/prisma/db';
import { toggleFavorite } from './favorite';

describe('toggleFavorite 软删 + 唯一键复用', () => {
  beforeEach(() => vi.clearAllMocks());

  it('已收藏 → 取消收藏写 deletedAt 而非物理删除', async () => {
    const row = { update: vi.fn(async () => ({})), delete: vi.fn(async () => ({})) };
    (getDb as any).mockResolvedValue({
      orm: {
        public: {
          Favorite: {
            first: vi.fn(async () => ({ id: 'f1', userId: 'u1', documentId: 'd1', deletedAt: null })),
            where: () => row,
          },
        },
      },
    });
    const result = await toggleFavorite('d1');
    expect(result).toBe(false);
    expect(row.update).toHaveBeenCalledWith(expect.objectContaining({
      deletedAt: expect.any(String),
    }));
    expect(row.delete).not.toHaveBeenCalled();
  });

  it('含墓碑旧行再收藏 → 清墓碑复用，不新建', async () => {
    const row = { update: vi.fn(async () => ({})) };
    const create = vi.fn(async () => ({}));
    (getDb as any).mockResolvedValue({
      orm: {
        public: {
          Favorite: {
            first: vi.fn(async () => ({
              id: 'f1',
              userId: 'u1',
              documentId: 'd1',
              deletedAt: '2026-09-28T00:00:00.000Z',
            })),
            where: () => row,
            create,
          },
        },
      },
    });
    const result = await toggleFavorite('d1');
    expect(result).toBe(true);
    expect(row.update).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: null }));
    expect(create).not.toHaveBeenCalled();
  });

  it('无旧行再收藏 → 新建行', async () => {
    const create = vi.fn(async () => ({}));
    (getDb as any).mockResolvedValue({
      orm: { public: { Favorite: { first: vi.fn(async () => null), create } } },
    });
    const result = await toggleFavorite('d1');
    expect(result).toBe(true);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1',
      documentId: 'd1',
    }));
  });
});
