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

  it('R-10 I-1：document_tag 复合键取自 data——applied id 与 cursor 为 documentId__tagId', async () => {
    const create = vi.fn(async () => ({}));
    const chain = { where: () => chain, first: vi.fn(async () => null), update: vi.fn(), create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, { get: (_t, m) => m === 'SyncEvent' ? { create } : chain }) } });

    const res = await POST(req({ records: [
      { table: 'document_tag', id: 'x', op: 'upsert',
        data: { documentId: 'd1', tagId: 't1' }, syncTs: '2026-09-28T12:00:00.000Z' },
    ]}));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.applied).toEqual([{ table: 'document_tag', id: 'd1__t1' }]);
    expect(body.cursor).toContain('d1__t1');
    expect(body.cursor).not.toContain('undefined');
    // where 与 pk 同源（merged data）：单行读用复合键两列
    expect(chain.first).toHaveBeenCalledWith({ documentId: 'd1', tagId: 't1' });
  });

  it('R-10 M-3：document_tag 缺 data（documentId/tagId 必填非空字符串）→ 400', async () => {
    const res = await POST(req({ records: [
      { table: 'document_tag', id: 'x', op: 'upsert', syncTs: '2026-09-28T12:00:00.000Z' },
    ]}));
    expect(res.status).toBe(400);

    const res2 = await POST(req({ records: [
      { table: 'document_tag', id: 'x', op: 'delete',
        data: { documentId: 'd1', tagId: '' }, syncTs: '2026-09-28T12:00:00.000Z' },
    ]}));
    expect(res2.status).toBe(400);
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

  it('R-19：create 撞唯一键（同唯一键存量行不同 pk）→ 回读现存行跑 LWW，200 非 500', async () => {
    const existing = {
      id: 'f1', userId: 'u1', documentId: 'd1', order: 0,
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-28T09:00:00.000Z',
      deletedAt: '2026-09-28T09:00:00.000Z', // 墓碑行：pk 不同但 (userId,documentId) 撞唯一键
    };
    const update = vi.fn(async (..._args: unknown[]) => ({}));
    const create = vi.fn(async () => { throw new Error('unique violation'); });
    const first = vi.fn(async (where: any) => (where.id === 'f2' ? null : existing));
    const chain = { where: () => chain, first, update, create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const rec = (syncTs: string) => ({
      table: 'favorite', id: 'f2', op: 'upsert',
      data: { id: 'f2', userId: 'u1', documentId: 'd1', order: 3 },
      syncTs,
    });

    // 客户端更新（12:00 > 服务端 09:00）→ apply：盖存量行，applied 报存量行真实 pk
    const res = await POST(req({ records: [rec('2026-09-28T12:00:00.000Z')] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.applied).toEqual([{ table: 'favorite', id: 'f1' }]);
    expect(first).toHaveBeenCalledWith({ userId: 'u1', documentId: 'd1' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ order: 3 }));
    // 不动存量行主键（payload 里的 id 必须剥掉）
    expect(update.mock.calls[0][0]).not.toHaveProperty('id');

    // 客户端更旧（08:00 < 09:00）→ reject：回传现存行现值，仍 200
    const res2 = await POST(req({ records: [rec('2026-09-28T08:00:00.000Z')] }));
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.applied).toHaveLength(0);
    expect(body2.rejected).toHaveLength(1);
    expect(body2.rejected[0].data.id).toBe('f1');
  });

  it('I1(a)(c)：data 与 def.cols 求交——content 等白名单外键不入写入；带 userId 列的表强制会话 userId', async () => {
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const create = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const first = vi.fn(async (_where: Record<string, unknown>): Promise<any> => null);
    const chain = { where: () => chain, first, update, create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [{
      table: 'document', id: 'd9', op: 'upsert',
      data: { title: 'ok', content: { secret: 1 }, evil: 'x', userId: 'attacker' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
    const arg = create.mock.calls[0]![0]!;
    expect(arg).not.toHaveProperty('content'); // 白名单外列不落库
    expect(arg).not.toHaveProperty('evil');
    expect(arg.title).toBe('ok');
    expect(arg.userId).toBe('u1'); // 会话用户覆盖 payload 里的 userId
    // (c) first/update 的 where 带会话 userId 收窄
    expect(first).toHaveBeenCalledWith({ id: 'd9', userId: 'u1' });

    // update 分支同样收窄 where、且 payload 求交
    first.mockResolvedValueOnce({ id: 'd9', userId: 'u1', title: 'old',
      updatedAt: '2026-09-28T09:00:00.000Z', metaUpdatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null });
    const res2 = await POST(req({ records: [{
      table: 'document', id: 'd9', op: 'upsert',
      data: { title: 'new', content: { secret: 2 } },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(res2.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]![0]).not.toHaveProperty('content');
    expect(chain.where()).toBe(chain); // where 简写链可组合
    expect(first).toHaveBeenLastCalledWith({ id: 'd9', userId: 'u1' });
  });

  it('I1(b)：user 表记录 id ≠ 会话用户 id → 400 整批拒绝', async () => {
    const res = await POST(req({ records: [{
      table: 'user', id: 'someone-else', op: 'upsert',
      data: { name: 'x' }, syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(res.status).toBe(400);
  });

  it('I8：delete-op 对含 isDeleted 列的表同时写 isDeleted:true（读侧按 isDeleted 过滤，只写 deletedAt 会复活）', async () => {
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const create = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const first = vi.fn(async (_where: Record<string, unknown>): Promise<any> => ({
      id: 'd1', updatedAt: '2026-09-28T09:00:00.000Z',
      metaUpdatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null,
    }));
    const chain = { where: () => chain, first, update, create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [
      { table: 'document', id: 'd1', op: 'delete', syncTs: '2026-09-28T12:00:00.000Z' },
      // 无 isDeleted 列的表（document_tag）不受影响，只写 deletedAt/updatedAt
      { table: 'document_tag', id: 'x', op: 'delete',
        data: { documentId: 'd1', tagId: 't1' }, syncTs: '2026-09-28T12:00:00.000Z' },
    ] }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(2);
    const docDel = update.mock.calls[0]![0]!;
    expect(docDel.isDeleted).toBe(true);              // 含列的表：delete-op 强制写
    expect(typeof docDel.deletedAt).toBe('string');
    const tagDel = update.mock.calls[1]![0]!;
    expect(tagDel).not.toHaveProperty('isDeleted');   // 不含列的表：不写
    expect(typeof tagDel.deletedAt).toBe('string');
  });

  it('R-19：create 抛错且无唯一键定位器/定位不到存量行 → 仍整批 500（不吞真错误）', async () => {
    const create = vi.fn(async () => { throw new Error('boom'); });
    const first = vi.fn(async () => null);
    const chain = { where: () => chain, first, update: vi.fn(), create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [{
      table: 'folder', id: 'f1', op: 'upsert', data: { name: 'x' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(res.status).toBe(500);
  });
});
