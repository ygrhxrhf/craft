// src/app/api/v1/sync/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

/**
 * 墓碑清理（purgeTombstones）的专用替身。
 *
 * 为什么不能复用文件顶部的 mockDb：purge 走的是
 * `where(lambda).select(...cols).limit(100).all()` 再 `where(predicate).deleteAndCount()`，
 * 而 mockDb 的 chain 没有 select/deleteAndCount ⇒ route.ts:360 的 catch 把 TypeError 吞掉
 * ⇒ 用旧替身时 purge 的所有断言都会**假通过**（观察到的是"没删"，真相是"根本没跑"）。
 *
 * lambda 在这里被真实求值：字段代理的 lt()/in()/eq() 记录 route.ts 传进来的 cutoff 与 id 集，
 * all() 再按 cutoff 过滤给定行 —— 等价于数据库侧的 `deletedAt < cutoff` 语义。
 */
function mockPurgeDb(tombstones: { id: string; deletedAt: string }[]) {
  const seen = { cutoffs: [] as string[], ids: [] as unknown[], limits: [] as number[], models: [] as string[] };
  let currentModel = '';
  let cutoff = '';
  let cols: string[] = [];
  let limit = Infinity;
  // all() 必须只认「本次链是 lambda（purge）还是对象（主循环）」：cutoff 是跨 GET 复用的
  // 闭包变量，若不隔离，第二次 GET 的主循环也会按上一次的 cutoff 拿到墓碑行 ⇒
  // document_tag 等 lambda 分支被意外激活，测出来的是替身的串扰而不是路由的行为。
  let purgeChain = false;
  const model: any = {
    where: (cond: unknown) => {
      purgeChain = typeof cond === 'function';
      if (purgeChain) {
        const field = () => ({
          lt: (v: string) => { cutoff = v; seen.cutoffs.push(v); return true; },
          in: (ids: unknown) => { seen.ids.push(ids); return true; },
          eq: () => true,
        });
        (cond as (r: Record<string, ReturnType<typeof field>>) => unknown)(
          new Proxy({}, { get: () => field() }));
        seen.models.push(currentModel);
      }
      return model;
    },
    select: (...c: string[]) => { cols = c; return model; },
    limit: (n: number) => { limit = n; seen.limits.push(n); return model; },
    all: async () => {
      if (!purgeChain) return []; // 主循环：本替身只服务 purge，同步流一律空
      return tombstones
        .filter(t => t.deletedAt < cutoff)
        .slice(0, limit)
        .map(t => Object.fromEntries(cols.map(c => [c, (t as Record<string, unknown>)[c]])));
    },
    deleteAndCount: vi.fn(async () => ({ count: 0 })),
  };
  (getDb as any).mockResolvedValue({
    orm: { public: new Proxy({}, { get: (_t, m: string) => { currentModel = m; return model; } }) },
  });
  return seen;
}

describe('GET 墓碑 30 天边界（懒清理轮转）', () => {
  const NOW = Date.parse('2026-09-30T00:00:00.000Z');
  const DAY = 864e5;
  const iso = (ms: number) => new Date(ms).toISOString();
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterEach(() => nowSpy.mockRestore());

  it('31 天前的墓碑被删、29 天前的保留，cutoff 恰为 30 天', async () => {
    const seen = mockPurgeDb([
      { id: 'new', deletedAt: iso(NOW - 29 * DAY) },
      { id: 'old', deletedAt: iso(NOW - 31 * DAY) },
    ]);
    expect((await GET(new NextRequest('http://x/api/v1/sync'))).status).toBe(200);
    expect(seen.cutoffs[0]).toBe(iso(NOW - 30 * DAY));
    expect(seen.ids[0]).toEqual(['old']); // 只有过期行进删除集
  });

  it('未过期（29 天）时不发删除语句', async () => {
    const seen = mockPurgeDb([{ id: 'new', deletedAt: iso(NOW - 29 * DAY) }]);
    await GET(new NextRequest('http://x/api/v1/sync'));
    expect(seen.ids).toHaveLength(0); // rows.length===0 → 提前 return，不碰 deleteAndCount
  });

  it('单次至多 100 行（余量留给下次轮转）', async () => {
    const many = Array.from({ length: 150 }, (_, i) => ({
      id: `x${i}`, deletedAt: iso(NOW - 60 * DAY),
    }));
    const seen = mockPurgeDb(many);
    await GET(new NextRequest('http://x/api/v1/sync'));
    expect(seen.limits).toContain(100);
    expect(seen.ids[0]).toHaveLength(100);
  });

  it('轮转：连续两次 GET 清理不同的表（一轮扫不完全部 11 张）', async () => {
    const seen = mockPurgeDb([{ id: 'old', deletedAt: iso(NOW - 40 * DAY) }]);
    await GET(new NextRequest('http://x/api/v1/sync'));
    await GET(new NextRequest('http://x/api/v1/sync'));
    const tables = seen.models.filter((_, i) => i % 2 === 0); // 每表 select+delete 两次 where
    expect(new Set(tables).size).toBe(2);
  });
});

describe('POST 鉴权与 R-1 写侧归属（P1 遗留补齐）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('未授权返回 401，且在读体/开库之前就短路（不碰数据库）', async () => {
    const { requireUserId, AuthorizationError } = await import('@/lib/authz/guard');
    vi.mocked(requireUserId).mockRejectedValueOnce(new AuthorizationError());
    const res = await POST(req({ records: [{
      table: 'document', id: 'd1', op: 'upsert',
      data: { title: 'x' }, syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(res.status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });

  it('鉴权抛的不是 AuthorizationError → 500（不把未知故障伪装成未登录）', async () => {
    const { requireUserId } = await import('@/lib/authz/guard');
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error('db down'));
    const res = await POST(req({ records: [{
      table: 'document', id: 'd1', op: 'upsert',
      data: { title: 'x' }, syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(res.status).toBe(500);
  });

  it('I1(c) 写侧收窄：update 与 delete 两条路径的 where 都带会话 userId（不止 first）', async () => {
    const first = vi.fn(async (): Promise<any> => ({
      id: 'd5', userId: 'u1', title: 'old',
      updatedAt: '2026-09-28T09:00:00.000Z', metaUpdatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null,
    }));
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const chain: any = { first, update, create: vi.fn() };
    const where = vi.fn((_cond: Record<string, unknown>) => chain);
    chain.where = where;
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [
      { table: 'document', id: 'd5', op: 'upsert', data: { title: 'new' }, syncTs: '2026-09-28T12:00:00.000Z' },
      { table: 'document', id: 'd5', op: 'delete', syncTs: '2026-09-28T13:00:00.000Z' },
    ] }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(2);
    // 谓词写入（model.where(cond).update）同样被会话 userId 收窄：
    // 只改 first 的话，攻击者可用任意 id 命中他人行。
    const conds = where.mock.calls.map(c => c[0]);
    expect(conds).toEqual([
      { id: 'd5', userId: 'u1' },
      { id: 'd5', userId: 'u1' },
    ]);
    expect(conds.every(c => c.userId === 'u1')).toBe(true);
  });

  it('R-1：user 表按会话 id 定位，where 不取记录 id 也不带 userId 列', async () => {
    const first = vi.fn(async (): Promise<any> => ({
      id: 'u1', name: 'old', updatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null,
    }));
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const chain: any = { first, update, create: vi.fn() };
    const where = vi.fn((_cond: Record<string, unknown>) => chain);
    chain.where = where;
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [{
      table: 'user', id: 'u1', op: 'upsert', data: { name: 'new' }, syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(res.status).toBe(200);
    expect(first).toHaveBeenCalledWith({ id: 'u1' });
    expect(where).toHaveBeenCalledWith({ id: 'u1' });
    // user 表不在 USER_ID_TABLES：payload 不该出现 userId 列（schema 里也没有）
    expect(update.mock.calls[0]![0]).not.toHaveProperty('userId');
    expect(update.mock.calls[0]![0]).toMatchObject({ name: 'new' });
  });
});
