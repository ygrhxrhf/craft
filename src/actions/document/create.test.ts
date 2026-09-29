import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/auth/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }));

import { getDb } from '@/prisma/db';
import { createDocument } from './create';

describe('createDocument metaUpdatedAt（T4 缺口：新行须进增量同步）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('新建文档行显式带 metaUpdatedAt', async () => {
    const create = vi.fn(async (_data?: Record<string, unknown>) => ({}));
    (getDb as any).mockResolvedValue({ orm: { public: { Document: { create, first: vi.fn(async () => null) } } } });
    await createDocument({ title: '新文档' });
    expect(create).toHaveBeenCalledTimes(1);
    const arg = create.mock.calls[0]![0]!;
    expect(arg.metaUpdatedAt).toEqual(expect.any(String));
  });

  it('模板/副本路径同样带 metaUpdatedAt', async () => {
    const create = vi.fn(async (_data?: Record<string, unknown>) => ({}));
    const first = vi.fn(async () => ({
      id: 'src1', userId: 'u1', title: '源', icon: null, coverImage: null, coverType: null,
      content: null, plainText: '', width: null, pageStyle: null, folderId: null, isTemplate: true,
    }));
    (getDb as any).mockResolvedValue({ orm: { public: { Document: { create, first } } } });
    await createDocument({ useTemplateId: 'tpl1' });
    const arg = create.mock.calls[0]![0]!;
    expect(arg.metaUpdatedAt).toEqual(expect.any(String));
  });
});
