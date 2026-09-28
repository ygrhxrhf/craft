import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  assertOwned: vi.fn(async () => ({ id: 't1', userId: 'u1' })),
}));
vi.mock('@/lib/authz/document-access', () => ({
  requireDocumentAccess: vi.fn(async () => ({
    document: { id: 'd1', userId: 'u1' },
    role: 'owner',
  })),
}));

import { getDb } from '@/prisma/db';
import { deleteTag, detachTag, attachTag, getTags } from './tag';

/** 真实 where 语义的最小实现：`{ k: null }` → IS NULL，其余等值匹配。 */
function matchRow(row: Record<string, unknown>, cond: Record<string, unknown>) {
  return Object.entries(cond).every(([k, v]) => (v === null ? row[k] == null : row[k] === v));
}

describe('deleteTag 软删', () => {
  beforeEach(() => vi.clearAllMocks());

  it('删除标签写 deletedAt 而非物理删除', async () => {
    const row = { update: vi.fn(async () => ({})), delete: vi.fn(async () => ({})) };
    (getDb as any).mockResolvedValue({
      orm: { public: { Tag: { where: () => row } } },
    });
    await deleteTag('t1');
    expect(row.update).toHaveBeenCalledWith(expect.objectContaining({
      deletedAt: expect.any(String),
    }));
    expect(row.delete).not.toHaveBeenCalled();
  });
});

describe('detachTag 软删文档-标签关联', () => {
  beforeEach(() => vi.clearAllMocks());

  it('解除打标写 DocumentTag.deletedAt 而非物理删除', async () => {
    const row = { update: vi.fn(async () => ({})), delete: vi.fn(async () => ({})) };
    (getDb as any).mockResolvedValue({
      orm: {
        public: {
          DocumentTag: {
            first: vi.fn(async () => ({ documentId: 'd1', tagId: 't1' })),
            where: () => row,
          },
        },
      },
    });
    await detachTag('d1', 't1');
    expect(row.update).toHaveBeenCalledWith(expect.objectContaining({
      deletedAt: expect.any(String),
    }));
    expect(row.delete).not.toHaveBeenCalled();
  });
});

describe('唯一键复用', () => {
  beforeEach(() => vi.clearAllMocks());

  it('attachTag 命中含墓碑的 DocumentTag 旧行 → 清墓碑复用，不新建', async () => {
    const dtRow = { update: vi.fn(async () => ({})) };
    const dtCreate = vi.fn(async () => ({}));
    const liveTag = { id: 't1', name: 'work', color: '#6366f1' };
    (getDb as any).mockResolvedValue({
      orm: {
        public: {
          Tag: {
            first: vi.fn(async () => liveTag),
            where: () => ({ all: async () => [liveTag] }),
          },
          DocumentTag: {
            first: vi.fn(async () => ({
              documentId: 'd1',
              tagId: 't1',
              deletedAt: '2026-09-28T00:00:00.000Z',
            })),
            where: () => dtRow,
            create: dtCreate,
          },
        },
      },
    });
    const tag = await attachTag('d1', 'Work');
    expect(dtRow.update).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: null }));
    expect(dtCreate).not.toHaveBeenCalled();
    expect(tag?.id).toBe('t1');
  });

  it('createTag 同名命中含墓碑行 → 清墓碑返回旧 id，不新建标签', async () => {
    const tagRow = { update: vi.fn(async () => ({})) };
    const tombstonedTag = {
      id: 't1',
      name: 'work',
      color: '#6366f1',
      deletedAt: '2026-09-28T00:00:00.000Z',
    };
    const tagCreate = vi.fn(async () => ({}));
    const dtCreate = vi.fn(async () => ({}));
    (getDb as any).mockResolvedValue({
      orm: {
        public: {
          Tag: {
            first: vi.fn(async () => tombstonedTag),
            where: () => ({ all: async () => [tombstonedTag], update: tagRow.update }),
            create: tagCreate,
          },
          DocumentTag: {
            first: vi.fn(async () => null),
            where: () => ({ update: vi.fn() }),
            create: dtCreate,
          },
        },
      },
    });
    const tag = await attachTag('d1', 'Work');
    expect(tagRow.update).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: null }));
    expect(tagCreate).not.toHaveBeenCalled();
    expect(tag?.id).toBe('t1');
    expect(dtCreate).toHaveBeenCalled();
  });
});

describe('attachTag 对活行 no-op（R-8）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('attachTag 命中已存在的活 DocumentTag 行时不调用 update（避免重复 sync 事件）', async () => {
    const dtRow = { update: vi.fn(async () => ({})) };
    const dtCreate = vi.fn(async () => ({}));
    const liveTag = { id: 't1', name: 'work', color: '#6366f1' };
    (getDb as any).mockResolvedValue({
      orm: {
        public: {
          Tag: {
            first: vi.fn(async () => liveTag),
            where: () => ({ all: async () => [liveTag] }),
          },
          DocumentTag: {
            first: vi.fn(async () => ({
              documentId: 'd1',
              tagId: 't1',
              deletedAt: null,
            })),
            where: () => dtRow,
            create: dtCreate,
          },
        },
      },
    });
    const tag = await attachTag('d1', 'Work');
    expect(dtRow.update).not.toHaveBeenCalled();
    expect(dtCreate).not.toHaveBeenCalled();
    expect(tag?.id).toBe('t1');
  });
});

describe('读侧墓碑过滤（C-1）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getTags 不返回带 deletedAt 的标签行', async () => {
    const rows = [
      { id: 't1', userId: 'u1', name: 'live', color: '#6366f1', deletedAt: null },
      {
        id: 't2',
        userId: 'u1',
        name: 'dead',
        color: '#ef4444',
        deletedAt: '2026-09-28T00:00:00.000Z',
      },
    ];
    (getDb as any).mockResolvedValue({
      orm: {
        public: {
          Tag: {
            where: (cond: Record<string, unknown>) => ({
              all: async () => rows.filter((row) => matchRow(row, cond)),
            }),
          },
        },
      },
    });
    const tags = await getTags();
    expect(tags.map((tag) => tag.id)).toEqual(['t1']);
  });
});
