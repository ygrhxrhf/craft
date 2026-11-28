import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));

import { getDb } from '@/prisma/db';
import { issueMcpToken } from '@/lib/mcp/token';
import { GET } from './route';

const READ = issueMcpToken('u1', 'read');
const WRITE = issueMcpToken('u1', 'write');

function request(token?: string) {
  return new Request('http://localhost/api/v1/documents/doc_1/markdown', {
    method: 'GET',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function params(id = 'doc_1') {
  return { params: Promise.resolve({ id }) };
}

function mockDb(row: Record<string, unknown> | null) {
  const document = { first: vi.fn(async () => row) };
  const db = { orm: { public: { Document: document } } };
  (getDb as any).mockResolvedValue(db);
  return document;
}

const DOC = {
  id: 'doc_1',
  userId: 'u1',
  title: '长夜行·第一稿',
  isDeleted: false,
  updatedAt: '2026-11-29T02:00:00.000Z',
  content: {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '第一章 归来' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '铜锁在门上挂了三次。' }] },
    ],
  },
};

describe('GET /api/v1/documents/:id/markdown', () => {
  beforeEach(() => vi.clearAllMocks());

  it('没有令牌 401', async () => {
    mockDb(DOC);
    const res = await GET(request(), params());
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('unauthorized');
  });

  it('令牌被改过 401，报错里不回显令牌', async () => {
    mockDb(DOC);
    const tampered = `${READ.slice(0, -4)}AAAA`;
    const res = await GET(request(tampered), params());
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toContain(tampered);
  });

  it('别人的文档与已删除的文档一律 404，不漏存在性', async () => {
    mockDb({ ...DOC, userId: 'u2' });
    expect((await GET(request(READ), params())).status).toBe(404);

    mockDb({ ...DOC, isDeleted: true });
    const deleted = await GET(request(READ), params());
    expect(deleted.status).toBe(404);
    expect((await deleted.json()).code).toBe('not_found');

    mockDb(null);
    expect((await GET(request(READ), params())).status).toBe(404);
  });

  it('导出 Markdown：标题、正文与字符数都在', async () => {
    const document = mockDb(DOC);
    const res = await GET(request(READ), params());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe('doc_1');
    expect(body.title).toBe('长夜行·第一稿');
    expect(body.markdown).toMatch(/^#{1,3} 第一章 归来$/m);
    expect(body.markdown).toContain('铜锁在门上挂了三次。');
    expect(body.chars).toBe(body.markdown.length);
    expect(body.updatedAt).toBe('2026-11-29T02:00:00.000Z');
    expect(document.first).toHaveBeenCalledWith({ id: 'doc_1' });
  });

  it('写档令牌同样能读：导出是只读操作', async () => {
    mockDb(DOC);
    const res = await GET(request(WRITE), params());
    expect(res.status).toBe(200);
  });

  it('空文档也给得出一份空 Markdown，不报错', async () => {
    mockDb({ ...DOC, content: null });
    const res = await GET(request(READ), params());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.markdown).toBe('');
    expect(body.chars).toBe(0);
  });
});
