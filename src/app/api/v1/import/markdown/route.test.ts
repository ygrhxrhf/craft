import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
// guard 会连带 import next-auth；这一测的是令牌鉴权的导入路由，会话面用不到。
vi.mock('@/lib/auth/auth', () => ({ auth: vi.fn(async () => null) }));

import { getDb } from '@/prisma/db';
import { issueMcpToken } from '@/lib/mcp/token';
import { POST } from './route';

const URL = 'http://localhost/api/v1/import/markdown';

function request(body: unknown, token?: string) {
  return new Request(URL, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  });
}

const WRITE = issueMcpToken('u1', 'write');
const READ = issueMcpToken('u1');

function mockDb(overrides: Record<string, unknown> = {}) {
  const syncEvent = { create: vi.fn(async () => ({})) };
  const document = {
    create: vi.fn(async (data: Record<string, unknown>) => ({ ...data })),
    first: vi.fn(async (_where?: Record<string, unknown>): Promise<Record<string, unknown> | null> => null),
    where: vi.fn(() => ({ update: vi.fn(async () => ({})) })),
  };
  const folder = {
    where: vi.fn(() => ({ all: vi.fn(async () => []) })),
    create: vi.fn(async (data: Record<string, unknown>) => ({ id: 'folder-new', ...data })),
  };
  const db = {
    orm: { public: { Document: document, Folder: folder, SyncEvent: syncEvent, ...overrides } },
  };
  (getDb as any).mockResolvedValue(db);
  return { db, document, folder, syncEvent };
}

describe('POST /api/v1/import/markdown', () => {
  beforeEach(() => vi.clearAllMocks());

  it('没有令牌 401', async () => {
    mockDb();
    const res = await POST(request({ files: [{ name: 'a.md', text: '# a' }] }));
    expect(res.status).toBe(401);
  });

  it('读令牌 403（写入需要写档）', async () => {
    mockDb();
    const res = await POST(request({ files: [{ name: 'a.md', text: '# a' }] }, READ));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('read_only');
  });

  it('新建：落进指定文件夹并带 metaUpdatedAt，再广播一次', async () => {
    const { document, folder, syncEvent } = mockDb();
    const res = await POST(
      request({ folder: '阅读笔记', files: [{ name: '《活着》.md', text: '# 活着\n\n## 概览\n余华' }] }, WRITE),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documents).toEqual([
      { id: expect.any(String), title: '《活着》', created: true },
    ]);
    expect(folder.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: '阅读笔记', userId: 'u1' }),
    );
    const created = document.create.mock.calls[0]![0] as Record<string, unknown>;
    expect(created.folderId).toEqual(expect.any(String));
    expect(created.userId).toBe('u1');
    expect(created.metaUpdatedAt).toEqual(expect.any(String));
    expect(created.plainText).toContain('余华');
    expect(syncEvent.create).toHaveBeenCalledTimes(1);
  });

  it('给了 documentId 就更新那一篇，不新建', async () => {
    const { document, folder } = mockDb();
    const update = vi.fn(async () => ({}));
    document.first = vi.fn(async (): Promise<Record<string, unknown> | null> => ({ id: 'doc-1', userId: 'u1', isDeleted: false }));
    document.where = vi.fn(() => ({ update }));

    const res = await POST(
      request({ files: [{ name: '《活着》.md', text: '# 活着 v2', documentId: 'doc-1' }] }, WRITE),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documents[0]).toMatchObject({ id: 'doc-1', created: false });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ title: '《活着》' }));
    expect(document.create).not.toHaveBeenCalled();
    expect(folder.create).not.toHaveBeenCalled();
  });

  it('documentId 不属于本人：404 not_found（不泄露是否存在）', async () => {
    const { document } = mockDb();
    document.first = vi.fn(async () => ({ id: 'doc-1', userId: 'someone-else', isDeleted: false }));
    const res = await POST(
      request({ files: [{ name: 'a.md', text: '# a', documentId: 'doc-1' }] }, WRITE),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('not_found');
  });

  it('单个文件超长 413', async () => {
    mockDb();
    const res = await POST(
      request({ files: [{ name: 'big.md', text: 'x'.repeat(500_001) }] }, WRITE),
    );
    expect(res.status).toBe(413);
  });

  it('files 为空或形状不对 400', async () => {
    mockDb();
    expect((await POST(request({ files: [] }, WRITE))).status).toBe(400);
    expect((await POST(request({ files: [{ name: 'a.md' }] }, WRITE))).status).toBe(400);
    expect((await POST(request({}, WRITE))).status).toBe(400);
  });

  it('请求体不是 JSON 400', async () => {
    mockDb();
    const res = await POST(
      new Request(URL, { method: 'POST', headers: { authorization: `Bearer ${WRITE}` }, body: 'nope' }),
    );
    expect(res.status).toBe(400);
  });
});
