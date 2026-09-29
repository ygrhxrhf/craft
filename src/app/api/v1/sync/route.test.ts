// src/app/api/v1/sync/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  AuthorizationError: class extends Error {},
}));

import { getDb } from '@/prisma/db';
import { GET, POST } from './route';

const row = (id: string, ts: string, deletedAt: string | null = null) => ({
  id, title: 't', content: { big: 'NEVER' }, plainText: 'x',
  isDeleted: false, deletedAt, updatedAt: ts, metaUpdatedAt: ts,
});

function mockDb(rows: any[]) {
  const chain = {
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(rows),
    all: () => Promise.resolve(rows),
    delete: vi.fn(async () => ({})),
  };
  (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
    get: (_t, model: string) => (model === 'SyncEvent' ? { create: vi.fn() } : chain),
  }) } });
  return chain;
}

describe('GET /api/v1/sync', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 未登录', async () => {
    const { requireUserId } = await import('@/lib/authz/guard');
    (requireUserId as any).mockRejectedValueOnce(new (await import('@/lib/authz/guard')).AuthorizationError());
    const res = await GET(new NextRequest('http://x/api/v1/sync'));
    expect(res.status).toBe(401);
  });

  it('400 非法 since / limit 越界', async () => {
    mockDb([]);
    expect((await GET(new NextRequest('http://x/api/v1/sync?since=bad'))).status).toBe(400);
    expect((await GET(new NextRequest('http://x/api/v1/sync?limit=5000'))).status).toBe(400);
  });

  it('payload 不含 content；删除行 op=delete；cursor 正确', async () => {
    mockDb([
      row('a', '2026-09-28T10:00:00.000Z'),
      { ...row('b', '2026-09-28T10:00:01.000Z'), deletedAt: '2026-09-28T10:00:01.000Z' },
    ]);
    const res = await GET(new NextRequest('http://x/api/v1/sync'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain('NEVER');
    const del = body.records.find((r: any) => r.id === 'b');
    expect(del.op).toBe('delete');
    expect(del.data).toBeUndefined();
    expect(body.cursor).toContain('|');
    expect(typeof body.hasMore).toBe('boolean');
  });
});

const req = (body: unknown) => new NextRequest('http://x/api/v1/sync', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

describe('POST /api/v1/sync', () => {
  beforeEach(() => vi.clearAllMocks());

  it('400 records 超 200 条', async () => {
    const records = Array.from({ length: 201 }, (_, i) => ({
      table: 'folder', id: `f${i}`, op: 'upsert', data: {}, syncTs: '2026-09-28T10:00:00.000Z',
    }));
    expect((await POST(req({ records }))).status).toBe(400);
  });

  it('LWW 拒绝旧记录并回传服务端最新值；接受新记录；写 sync_events', async () => {
    const update = vi.fn(async () => ({}));
    const create = vi.fn(async () => ({}));
    const rows = [
      { id: 'keep', title: 'server-newer', updatedAt: '2026-09-28T11:00:00.000Z', metaUpdatedAt: '2026-09-28T11:00:00.000Z', deletedAt: null },
      { id: 'fresh', title: 'x', updatedAt: '2026-09-28T09:00:00.000Z', metaUpdatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null },
    ];
    const chain = { where: () => chain, first: async ({ id }: any) => rows.find(r => r.id === id) ?? null, update, create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, { get: (_t, m) => m === 'SyncEvent' ? { create } : chain }) } });

    const res = await POST(req({ records: [
      { table: 'document', id: 'keep', op: 'upsert', data: { title: 'client-older' }, syncTs: '2026-09-28T10:00:00.000Z' },
      { table: 'document', id: 'fresh', op: 'upsert', data: { title: 'client-newer' }, syncTs: '2026-09-28T12:00:00.000Z' },
    ]}));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.rejected).toHaveLength(1);
    expect(body.rejected[0].data.title).toBe('server-newer');
    expect(body.applied).toEqual([{ table: 'document', id: 'fresh' }]);
    expect(update).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1); // applied 非空 → emit
    expect(body.cursor).toContain('|');
  });

  it('413 请求体超 2MB', async () => {
    const big = JSON.stringify({ records: [{ table: 'document', id: 'x', op: 'upsert',
      data: { title: 'y'.repeat(2 * 1024 * 1024) }, syncTs: '2026-09-28T10:00:00.000Z' }] });
    expect((await POST(new NextRequest('http://x/api/v1/sync', { method: 'POST', body: big }))).status).toBe(413);
  });

  it('事务中途异常 → 整批 500 且不 emit；整批重推幂等成功', async () => {
    const create = vi.fn(async () => ({}));
    const rows = [
      { id: 'a', title: 'x', updatedAt: '2026-09-28T09:00:00.000Z', metaUpdatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null },
      { id: 'b', title: 'y', updatedAt: '2026-09-28T09:00:00.000Z', metaUpdatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null },
    ];
    let failNext = true;
    const chain = {
      where: () => chain,
      first: async ({ id }: any) => rows.find(r => r.id === id) ?? null,
      update: vi.fn(async () => {
        if (failNext) { failNext = false; throw new Error('boom'); }
        return {};
      }),
      create,
    };
    const orm = { public: new Proxy({}, { get: (_t, m) => m === 'SyncEvent' ? { create } : chain }) };
    const db: any = { orm, transaction: vi.fn(async (fn: any) => fn({ orm })) };
    (getDb as any).mockResolvedValue(db);

    const body = { records: [
      { table: 'document', id: 'a', op: 'upsert', data: { title: 'x' }, syncTs: '2026-09-28T12:00:00.000Z' },
      { table: 'document', id: 'b', op: 'upsert', data: { title: 'y' }, syncTs: '2026-09-28T12:00:00.000Z' },
    ]};
    expect((await POST(req(body))).status).toBe(500); // 异常不返回部分确认
    expect(db.transaction).toHaveBeenCalled(); // 批量跑在事务包装内（真库异常即回滚）
    expect(create).not.toHaveBeenCalled(); // 未 emit → 不广播半批

    failNext = false;
    const retry = await POST(req(body)); // 客户端整批重推，LWW 幂等
    expect(retry.status).toBe(200);
    expect((await retry.json()).applied).toHaveLength(2);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
