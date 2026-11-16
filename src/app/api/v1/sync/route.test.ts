// src/app/api/v1/sync/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  AuthorizationError: class extends Error {},
}));
// 提醒投递挂在轮询头部（G02）。本文件其余用例只关心增量流，把它当外部依赖挡掉，
// 接线本身由下面两条专门用例来验。
vi.mock('@/lib/notification/materialize', () => ({
  materializeTaskReminders: vi.fn(async () => 0),
}));
// G03：每日摘要同样挂在轮询头部；接线由本文件的一条专门用例验，其余用例挡掉。
vi.mock('@/lib/notification/daily-digest', () => ({
  materializeDailyDigest: vi.fn(async () => 0),
}));

import { getDb } from '@/prisma/db';
import { materializeTaskReminders } from '@/lib/notification/materialize';
import { GET, POST } from './route';

const row = (id: string, ts: string, deletedAt: string | null = null) => ({
  id, title: 't', content: { big: 'NEVER' }, plainText: 'x',
  isDeleted: false, deletedAt, updatedAt: ts, metaUpdatedAt: ts,
});

function mockDb(rows: any[], byModel: Record<string, any[]> = {}, whereLog?: { model: string; arg: unknown }[]) {
  const chainFor = (modelRows: any[], model: string) => {
    const chain = {
      where: (arg: unknown) => {
        whereLog?.push({ model, arg });
        return chain;
      },
      orderBy: () => chain,
      select: () => chain,
      limit: () => Promise.resolve(modelRows),
      all: () => Promise.resolve(modelRows),
      delete: vi.fn(async () => ({})),
      deleteAndCount: vi.fn(async () => ({ count: 0 })),
    };
    return chain;
  };
  const shared = chainFor(rows, 'shared');
  (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
    get: (_t, model: string) => (
      model === 'SyncEvent' ? { create: vi.fn() }
        : model in byModel ? chainFor(byModel[model], model)
          : shared
    ),
  }) } });
  return shared;
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

  it('document_member 按本人文档归属拉取，不按协作者 userId 漏行', async () => {
    mockDb([], {
      Document: [row('d1', '2026-09-28T10:00:00.000Z')],
      DocumentMember: [{
        id: 'm1', documentId: 'd1', userId: 'collaborator', role: 'editor',
        addedBy: 'u1', createdAt: '2026-09-28T10:00:02.000Z',
        updatedAt: '2026-09-28T10:00:02.000Z',
      }],
    });
    const res = await GET(new NextRequest('http://x/api/v1/sync'));
    const body = await res.json();
    const member = body.records.find((r: any) => r.table === 'document_member');
    expect(member).toMatchObject({
      id: 'm1', op: 'upsert',
      data: { documentId: 'd1', userId: 'collaborator', role: 'editor' },
    });
  });

  // G02 接线：投递没有定时器，它跑在元数据轮询的头部。这两条锁的是"接线"本身——
  // 核（materialize.test.ts）早就有单测，但没人调用它，屏上就永远收不到提醒。
  it('轮询头部先做提醒投递，刚落成的行在同一次响应里就出库', async () => {
    const notifRows: any[] = [];
    mockDb([], { Notification: notifRows });
    vi.mocked(materializeTaskReminders).mockImplementationOnce(async () => {
      notifRows.push({
        id: 'n1', userId: 'u1', kind: 'taskReminder', taskId: 't1', documentId: null,
        title: '到期了', isResolved: false,
        createdAt: '2026-09-28T10:00:03.000Z', updatedAt: '2026-09-28T10:00:03.000Z', deletedAt: null,
      });
      return 1;
    });

    const body = await (await GET(new NextRequest('http://x/api/v1/sync'))).json();
    expect(materializeTaskReminders).toHaveBeenCalledWith('u1');
    const notif = body.records.find((r: any) => r.table === 'notification');
    expect(notif).toMatchObject({
      id: 'n1', op: 'upsert',
      data: { kind: 'taskReminder', title: '到期了', taskId: 't1' },
    });
  });

  it('投递是轮询的副作用：它失败时元数据照常出库', async () => {
    mockDb([row('a', '2026-09-28T10:00:00.000Z')]);
    vi.mocked(materializeTaskReminders).mockRejectedValueOnce(new Error('db down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(new NextRequest('http://x/api/v1/sync'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.records.map((r: any) => r.id)).toContain('a');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
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

  /**
   * G1634——413 的判据必须是**字节**，不是字符。`text.length` 数的是 UTF-16 码元：一枚汉字
   * 在这里只算 1、真发出去占 3 字节。中文批次（本产品主语言）因此能"本地放行、中间层撞 413"，
   * 而客户端只把本服务的 JSON 413 认成记录级（拆批重发），代理那枚 HTML 413 退回 network
   * ⇒ 同一批永远重推、永远不拆（G1630 修掉的毒批次换了个触发点回来）。
   */
  it('G1634：字符数不到 2M、字节数超 2M 的中文批次 → 413（拆批通路必须拿得到记录级 413）', async () => {
    // 700k 汉字＝700k 字符（<2M）但 UTF-8 约 2.1MB（>2M）
    const cjk = '汉'.repeat(700_000);
    expect(cjk.length).toBeLessThan(2 * 1024 * 1024);
    expect(new TextEncoder().encode(cjk).length).toBeGreaterThan(2 * 1024 * 1024);
    const body = JSON.stringify({ records: [{ table: 'document', id: 'x', op: 'upsert',
      data: { title: cjk }, syncTs: '2026-09-28T10:00:00.000Z' }] });
    const res = await POST(new NextRequest('http://x/api/v1/sync', { method: 'POST', body }));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'payload too large' });
  });

  it('G1634：中文批次但字节数在限内 → 照常落库（闸没把正常写拦掉）', async () => {
    const create = vi.fn(async () => ({}));
    const chain = { where: () => chain, first: vi.fn(async () => null), update: vi.fn(), create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });
    const body = JSON.stringify({ records: [{ table: 'document', id: 'd-cjk', op: 'upsert',
      data: { title: '汉'.repeat(400_000) }, syncTs: '2026-09-28T12:00:00.000Z' }] });
    expect((await POST(new NextRequest('http://x/api/v1/sync', { method: 'POST', body }))).status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('R-10 I-1：document_tag 复合键取自 data——applied id 与 cursor 为 documentId__tagId', async () => {
    const create = vi.fn(async () => ({}));
    const chain = { where: () => chain, first: vi.fn(async () => null), update: vi.fn(), create };
    // G1523 写侧鉴权要读 Document 判归属：这一篇归会话用户 u1（所有者）
    const docChain = { first: vi.fn(async () => ({ id: 'd1', userId: 'u1', isDeleted: false })) };
    // G1639 外键悬空闸要读 Tag：这一枚是真标签
    const tagChain = { first: vi.fn(async () => ({ id: 't1', userId: 'u1' })) };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, { get: (_t, m) =>
      m === 'SyncEvent' ? { create } : m === 'Document' ? docChain : m === 'Tag' ? tagChain : chain }) } });

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

  it('R-19 真库序：唯一键存量行必须在 create **之前**回读（事务里撞键后回读必炸 25P02）', async () => {
    // Postgres 一条语句失败即整个事务 aborted，后续任何查询抛 `current transaction is aborted`。
    // 所以"盲 create → 撞唯一键 → 再回读存量行"这条路在真库上永远走不到，只会整批 500
    // （真机取证：本地镜像持旧 id 点「取消固定」，连 8 次 500）。本用例把顺序钉死：
    // 存量行存在时 create 一次都不许调，且 first(定位器) 先于 update。
    const existing = {
      id: 'f1', userId: 'u1', documentId: 'd1', order: 0,
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-28T09:00:00.000Z',
      deletedAt: null,
    };
    const create = vi.fn(async () => { throw new Error('unique violation (would abort tx)'); });
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const first = vi.fn(async (where: any) => (where.id === 'f2' ? null : existing));
    const chain = { where: () => chain, first, update, create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [{
      table: 'favorite', id: 'f2', op: 'upsert',
      data: { id: 'f2', userId: 'u1', documentId: 'd1', deletedAt: '2026-09-28T12:00:00.000Z' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(create).not.toHaveBeenCalled();
    expect(body.applied).toEqual([{ table: 'favorite', id: 'f1' }]);
    expect(first.mock.invocationCallOrder[0])
      .toBeLessThan(update.mock.invocationCallOrder[0]!);
    // 存量行主键不动：update 按唯一键定位器，payload 剥掉 id
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: '2026-09-28T12:00:00.000Z' }));
    expect(update.mock.calls[0]![0]).not.toHaveProperty('id');
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
    // G1523 写侧鉴权要读 Document 判归属：d1 归会话用户 u1（所有者）。
    // ☆ Document 这个 model 自己也是 document 表（本用例第一笔就是 document delete），
    //   所以它必须同时具备 where/update，且 first 回的是同一枚文档行。
    const docChain: any = {
      where: () => docChain,
      first: async () => ({ id: 'd1', userId: 'u1', isDeleted: false, deletedAt: null,
        updatedAt: '2026-09-28T09:00:00.000Z', metaUpdatedAt: '2026-09-28T09:00:00.000Z' }),
      update,
      create,
    };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : m === 'Document' ? docChain : chain),
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
    // G1639 之后这一笔还多了一道外键闸：被引用的文档必须真在册（这里给一枚），
    // 否则会在 create 之前就被按悬空拒收、走不到"create 抛错"那条路。
    const docChain = { first: vi.fn(async () => ({ id: 'd1', userId: 'u1', isDeleted: false })) };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : m === 'Document' ? docChain : chain),
    }) } });

    const res = await POST(req({ records: [{
      // 用 favorite（配了闸，但这一笔带齐 documentId ⇒ 放行到 create）：撞键抛错 ⇒ 整批 500。
      // folder 的改名 patch 会被闸判 not_found、到不了 create —— 那由 G1513 那组用例覆盖。
      table: 'favorite', id: 'fav1', op: 'upsert', data: { documentId: 'd1' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(res.status).toBe(500);
  });

  /**
   * G1505——「按 pk 定位不到行」不等于「这台设备在离线新建」。
   * 离线新建（`create-local.ts`）带齐 `createRequires`，而"对一枚陈旧回收站行点恢复"
   * 只带 `isDeleted/deletedAt` 两列 ⇒ 旧代码照着 create 的通路铸出一枚服务端从未有过的壳文档。
   */
  it('G1505 铸造闸：定位不到行且缺 createRequires 的键 → 不 create，按 not_found 拒绝并回传 delete', async () => {
    const create = vi.fn(async () => ({}));
    const first = vi.fn(async () => null);
    const chain = { where: () => chain, first, update: vi.fn(), create };
    const emit = vi.fn();
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: emit } : chain),
    }) } });

    const res = await POST(req({ records: [
      // 陈旧行的「恢复」——TrashList 的那一笔原样
      { table: 'document', id: 'already-gone', op: 'upsert',
        data: { isDeleted: false, deletedAt: null }, syncTs: '2026-09-28T12:00:00.000Z' },
    ] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(create).not.toHaveBeenCalled();          // 核心：一个字节都不写
    expect(body.applied).toHaveLength(0);
    expect(body.rejected).toHaveLength(1);
    expect(body.rejected[0]).toMatchObject({
      table: 'document', id: 'already-gone', op: 'delete', reason: 'not_found',
    });
    // 服务端本来就没有这行 ⇒ 无从回传权威值（也绝不回传他人行的列）
    expect(body.rejected[0].data).toBeUndefined();
    // 全批未落 ⇒ 不广播（否则他端为一枚不存在的行重拉）
    expect(emit).not.toHaveBeenCalled();
  });

  it('G1505 铸造闸放过的仍是正常笔：离线新建（title 为空串）照旧 create，且同批陈旧行不牵连它', async () => {
    const create = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const first = vi.fn(async (_where: Record<string, unknown>): Promise<any> => null);
    const chain = { where: () => chain, first, update: vi.fn(), create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [
      // 闸在前：陈旧行那笔被拒
      { table: 'document', id: 'ghost', op: 'upsert', data: { deletedAt: null },
        syncTs: '2026-09-28T12:00:00.000Z' },
      // create-local.ts 的离线新建＝title 存在但为空串——键在即算，不看值
      { table: 'document', id: 'new-doc', op: 'upsert',
        data: { userId: 'u1', title: '', parentId: null, folderId: null },
        syncTs: '2026-09-28T12:00:01.000Z' },
    ] }));
    const body = await res.json();
    expect(body.applied).toEqual([{ table: 'document', id: 'new-doc' }]);
    expect(body.rejected).toHaveLength(1);
    expect(body.rejected[0].id).toBe('ghost');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]![0]!.title).toBe('');
  });

  it('G1626 闸按表配置：favorite 配闸后，离线收藏照旧 create、拖动排序不再铸壳', async () => {
    const create = vi.fn(async () => ({}));
    const first = vi.fn(async () => null);
    const chain = { where: () => chain, first, update: vi.fn(), create };
    // G1639：被收藏的文档必须真在册（外键闸）
    const docChain = { first: vi.fn(async () => ({ id: 'd1', userId: 'u1', isDeleted: false })) };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : m === 'Document' ? docChain : chain),
    }) } });

    // ① 离线收藏（toggle-local）带 documentId ⇒ 闸放过，照旧建行——配闸不能误伤正常操作
    const minted = await POST(req({ records: [{
      table: 'favorite', id: 'fav9', op: 'upsert', data: { documentId: 'd1', deletedAt: null },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(minted.status).toBe(200);
    expect((await minted.json()).applied).toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(1);

    // ② 拖动排序只带 order ⇒ 不是离线新建：旧代码会在陈旧行上铸一枚缺 documentId 的壳，
    //    撞 NOT NULL ⇒ 25P02 毒批次（G1626）。现在按 not_found 拒绝。
    const stale = await POST(req({ records: [{
      table: 'favorite', id: 'gone-fav', op: 'upsert', data: { order: 2 },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await stale.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'favorite', id: 'gone-fav', reason: 'not_found' });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('G1513：folder 有 createRequirements ⇒ 陈旧行的"改名/移入回收站"不再铸出壳文件夹', async () => {
    const create = vi.fn(async () => ({}));
    const first = vi.fn(async () => null);
    const chain = { where: () => chain, first, update: vi.fn(), create };
    const docChain = { first: vi.fn(async () => null) };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : m === 'Document' ? docChain : chain),
    }) } });

    // 改名 patch 只带 name（缺 isDeleted）⇒ 不是离线新建 ⇒ 不 create，按 not_found 回传
    const renamed = await POST(req({ records: [{
      table: 'folder', id: 'stale-f', op: 'upsert', data: { name: '改了名' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(renamed.status).toBe(200);
    const rb = await renamed.json();
    expect(rb.applied).toEqual([]);
    expect(rb.rejected[0]).toMatchObject({ table: 'folder', id: 'stale-f', reason: 'not_found' });

    // 移入回收站 patch 只带 isDeleted/deletedAt（缺 name）⇒ 同样拒绝
    const trashed = await POST(req({ records: [{
      table: 'folder', id: 'stale-f2', op: 'upsert',
      data: { isDeleted: true, deletedAt: '2026-09-28T12:00:00.000Z' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect((await trashed.json()).rejected[0]).toMatchObject({ table: 'folder', reason: 'not_found' });

    expect(create).not.toHaveBeenCalled();
  });

  it('G1513：folder 的离线新建（带齐 name+isDeleted）照旧 create；task 的改排期不再铸壳', async () => {
    const create = vi.fn(async () => ({}));
    const first = vi.fn(async () => null);
    const chain = { where: () => chain, first, update: vi.fn(), create };
    const docChain = { first: vi.fn(async () => null) };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : m === 'Document' ? docChain : chain),
    }) } });

    const res = await POST(req({ records: [
      { table: 'folder', id: 'new-f', op: 'upsert',
        data: { name: '未命名文件夹', isDeleted: false, deletedAt: null },
        syncTs: '2026-09-28T12:00:00.000Z' },
      // task 改排期只带四列（缺 title）⇒ 陈旧行上不铸壳
      { table: 'task', id: 'stale-t', op: 'upsert',
        data: { dueDate: '2026-10-01T00:00:00.000Z' },
        syncTs: '2026-09-28T12:00:00.000Z' },
    ] }));
    const body = await res.json();
    expect(body.applied).toEqual([{ table: 'folder', id: 'new-f' }]);
    // 拒收的 syncTs 是服务端时钟（serverNow），不是 rec.syncTs
    expect(body.rejected).toHaveLength(1);
    expect(body.rejected[0]).toMatchObject({ table: 'task', id: 'stale-t', op: 'delete', reason: 'not_found' });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('G1513：whiteboard 改名（无内核新建通路）不铸壳；comment 加表情同样不铸壳', async () => {
    const create = vi.fn(async () => ({}));
    const first = vi.fn(async () => null);
    const chain = { where: () => chain, first, update: vi.fn(), create };
    const docChain = { first: vi.fn(async () => null) };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : m === 'Document' ? docChain : chain),
    }) } });

    const res = await POST(req({ records: [
      { table: 'whiteboard', id: 'stale-wb', op: 'upsert', data: { name: '改了名' },
        syncTs: '2026-09-28T12:00:00.000Z' },
      { table: 'comment', id: 'stale-c', op: 'upsert', data: { reactions: [] },
        syncTs: '2026-09-28T12:00:00.000Z' },
    ] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected.map((r: any) => r.table)).toEqual(['whiteboard', 'comment']);
    expect(create).not.toHaveBeenCalled();
  });

  it('G1505 第二副面孔：同 id 已在他人名下 → 按 not_found 拒绝，不再撞主键打崩整批', async () => {
    const create = vi.fn(async () => { throw new Error('Unique constraint failed on Document.id'); });
    const first = vi.fn(async (where: any): Promise<any> =>
      // 会话 userId 收窄的那次读＝定位不到；不带 userId 的回读＝命中他人行
      where.userId === undefined ? { id: 'd1', userId: 'owner-elsewhere', title: '别人的' } : null);
    const chain = { where: () => chain, first, update: vi.fn(), create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    // 越权成员把自己那版标题推上来：带得齐铸造键，闸放得过，于是走到 create 撞主键
    const res = await POST(req({ records: [{
      table: 'document', id: 'd1', op: 'upsert', data: { title: '我的那版' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(res.status).toBe(200);                    // 旧行为＝整批 500＋无限重推的毒批次
    expect(body.applied).toHaveLength(0);
    expect(body.rejected[0]).toMatchObject({
      table: 'document', id: 'd1', op: 'delete', reason: 'not_found',
    });
    expect(body.rejected[0].data).toBeUndefined();   // 不回传他人行的一列
  });

  it('G1506：LWW 拒绝带 reason=stale（与 not_found 分得开，UI 才能说不同的话）', async () => {
    const update = vi.fn(async () => ({}));
    const rows = [{ id: 'keep', title: 'server-newer',
      updatedAt: '2026-09-28T11:00:00.000Z', metaUpdatedAt: '2026-09-28T11:00:00.000Z',
      deletedAt: null }];
    const chain = { where: () => chain, first: async ({ id }: any) => rows.find(r => r.id === id) ?? null, update, create: vi.fn() };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [
      { table: 'document', id: 'keep', op: 'upsert', data: { title: 'client-older' },
        syncTs: '2026-09-28T10:00:00.000Z' },
    ] }));
    const body = await res.json();
    expect(body.rejected[0].reason).toBe('stale');
    expect(body.rejected[0].data.title).toBe('server-newer');
  });

  // G1511①：墓碑不吃 stale——同一台设备"改名 → 删除"两笔连发时，先到先落的改名把那行时间戳
  // 抬到"此刻"，后一笔删除若仍比时间戳就会删不掉（动作被自己另一笔吞掉）。
  it('G1511①：delete-op 的陈旧拒绝改判为接受（墓碑不吃 stale）', async () => {
    const update = vi.fn(async () => ({}));
    // 存量行的时间戳比客户端的删除那笔新 ⇒ 走 decideLww 会判 reject
    const rows = [{ id: 'del-me', title: 'server-newer',
      updatedAt: '2026-09-28T11:00:00.000Z', metaUpdatedAt: '2026-09-28T11:00:00.000Z',
      deletedAt: null }];
    const chain = { where: () => chain, first: async ({ id }: any) => rows.find(r => r.id === id) ?? null, update, create: vi.fn() };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [
      { table: 'document', id: 'del-me', op: 'delete', syncTs: '2026-09-28T10:00:00.000Z' },
    ] }));
    const body = await res.json();
    expect(body.rejected).toHaveLength(0);
    expect(body.applied).toHaveLength(1);
    expect(update).toHaveBeenCalled();
  });

  // G1511③：落库时间戳只推进不倒退——客户端那笔比服务端此刻新时，取客户端的时间戳，
  // 免得服务端把时间戳往回拖、把同设备后一笔判旧。
  it('G1511③：客户端 syncTs 略超前（去抖窗口内）时，落库时间戳就是它（服务端不拖回"此刻"）', async () => {
    const update = vi.fn(async () => ({}));
    const rows = [{ id: 'fut', title: 'old',
      updatedAt: '2026-09-28T10:00:00.000Z', metaUpdatedAt: '2026-09-28T10:00:00.000Z',
      deletedAt: null }];
    const chain = { where: () => chain, first: async ({ id }: any) => rows.find(r => r.id === id) ?? null, update, create: vi.fn() };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    // G1638 之后"未来戳"有了上限：去抖窗口（2s）内的略超前仍按客户端值落库，
    // 超出的（如 2099）才钳到此刻——这条用例钉的是前半句。
    const ahead = new Date(Date.now() + 2_000).toISOString();
    const res = await POST(req({ records: [
      { table: 'document', id: 'fut', op: 'upsert', data: { title: 'new' }, syncTs: ahead },
    ] }));
    const body = await res.json();
    expect(body.applied).toHaveLength(1);
    // 落库那笔的 metaUpdatedAt 就是客户端给的那枚（服务端没有把它拖回"此刻"）
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ metaUpdatedAt: ahead }));
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
      }
      return model;
    },
    // G1643：模型名只在 purge 的两端（select / deleteAndCount）登记。GET 的墓碑事件读也走
    // lambda，但它既 select 也不 delete——若在 where 处登记，会被当成一轮清理、把配对打乱。
    select: (...c: string[]) => { cols = c; seen.models.push(currentModel); return model; },
    limit: (n: number) => { limit = n; seen.limits.push(n); return model; },
    all: async () => {
      if (!purgeChain) return []; // 主循环：本替身只服务 purge，同步流一律空
      return tombstones
        .filter(t => t.deletedAt < cutoff)
        .slice(0, limit)
        .map(t => Object.fromEntries(cols.map(c => [c, (t as Record<string, unknown>)[c]])));
    },
    deleteAndCount: vi.fn(async () => {
      seen.models.push(currentModel);
      return { count: 0 };
    }),
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

  it('轮转：连续两次 GET 清理不同的表（一轮只扫一张，清单见 purge-plan）', async () => {
    const seen = mockPurgeDb([{ id: 'old', deletedAt: iso(NOW - 40 * DAY) }]);
    await GET(new NextRequest('http://x/api/v1/sync'));
    await GET(new NextRequest('http://x/api/v1/sync'));
    // G1643 起 mockPurgeDb 在 select 与 deleteAndCount 各登记一次模型名 ⇒ 两张表两轮共 4 条，
    // 隔一条取一条（每轮 select→deleteAndCount 同一张表）。
    const tables = seen.models.filter((_, i) => i % 2 === 0);
    expect(tables).toHaveLength(2);
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

describe('GET /api/v1/sync 的收藏隐私作用域（G240）', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Favorite 只按会话 userId 取行，不按文档共享范围取', async () => {
    const log: { model: string; arg: unknown }[] = [];
    mockDb([], { Favorite: [] }, log);
    await GET(new NextRequest('http://x/api/v1/sync'));
    const fav = log.filter((e) => e.model === 'Favorite').map((e) => e.arg as { userId?: string });
    expect(fav).toHaveLength(1);
    expect(fav[0]).toEqual({ userId: 'u1' });
  });
});

describe('收藏的墓碑走 upsert 列，不走 delete op（G240 写侧契约）', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['取消收藏', '2026-09-28T12:00:00.000Z'],
    ['重新收藏', null as string | null],
  ])('%s：payload.deletedAt 原样落库，服务端不另写 isDeleted', async (_label, deletedAt) => {
    const current = {
      id: 'f1', userId: 'u1', documentId: 'd1', order: 0,
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-28T09:00:00.000Z',
      deletedAt: _label === '取消收藏' ? null : '2026-09-28T09:00:00.000Z',
    };
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const first = vi.fn(async (_where: Record<string, unknown>): Promise<any> => current);
    const chain: any = { where: () => chain, first, update, create: vi.fn() };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [{
      table: 'favorite', id: 'f1', op: 'upsert',
      data: { documentId: 'd1', deletedAt },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(res.status).toBe(200);
    expect((await res.json()).applied).toEqual([{ table: 'favorite', id: 'f1' }]);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ deletedAt }));
    // Favorite 没有 isDeleted 列：写侧不得凭空造列（读侧按 deletedAt 过滤）
    expect(update.mock.calls[0]![0]).not.toHaveProperty('isDeleted');
  });
});

/**
 * G1523——写侧文档作用域鉴权。GET 侧一直按"本人文档"收窄（`DOC_SCOPED_TABLES`），
 * 而 POST 侧此前**一次都没校验**：document_tag/comment_thread/document_share/document_member
 * 都没有 userId 列、不在 USER_ID_TABLES 里，where 只剩 `{id}`／`{documentId,tagId}` ⇒
 * 任何登录用户 POST 一枚 `document_member{documentId: 别人的文档, userId: 自己, role: editor}`
 * 就能把自己加成那篇文档的编辑（IDOR 提权）。这里逐表钉住档位与拒收形状。
 */
describe('POST /api/v1/sync — G1523 文档作用域写侧鉴权', () => {
  beforeEach(() => vi.clearAllMocks());

  /** 造一个 db：Document/DocumentMember 按给定行回，其余表共用一条可记录 create/update 的链。 */
  function scopedDb(opts: {
    documents?: Record<string, unknown>[];
    members?: Record<string, unknown>[];
    tags?: Record<string, unknown>[];
  }) {
    const create = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const del = vi.fn(async () => ({}));
    const makeTable = (rows: Record<string, unknown>[]) => {
      const t: any = {
        where: () => t,
        first: async (where: Record<string, unknown>) =>
          rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
        create,
        update,
        delete: del,
      };
      return t;
    };
    const generic = makeTable([]);
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) =>
        m === 'SyncEvent' ? { create: vi.fn() }
          : m === 'Document' ? makeTable(opts.documents ?? [])
            : m === 'DocumentMember' ? makeTable(opts.members ?? [])
              : m === 'Tag' ? makeTable(opts.tags ?? [])
                : generic,
    }) } });
    return { create, update, del };
  }

  it('越权：把自己加成别人文档的编辑 → not_found 拒绝，不 create', async () => {
    // victim-doc 归 owner-elsewhere；会话用户 u1 既非所有者也不是它的成员
    const { create } = scopedDb({
      documents: [{ id: 'victim-doc', userId: 'owner-elsewhere', isDeleted: false }],
      members: [],
    });
    const res = await POST(req({ records: [{
      table: 'document_member', id: 'forged-1', op: 'upsert',
      data: { documentId: 'victim-doc', userId: 'u1', role: 'editor' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.applied).toEqual([]);
    expect(body.rejected).toEqual([{
      table: 'document_member', id: 'forged-1', op: 'delete', syncTs: '2026-09-28T12:00:00.000Z', reason: 'not_found',
    }]);
    expect(create).not.toHaveBeenCalled();
  });

  it('越权：往别人文档挂一枚标签（document_tag upsert）→ 同样 not_found', async () => {
    const { create } = scopedDb({
      documents: [{ id: 'victim-doc', userId: 'owner-elsewhere', isDeleted: false }],
    });
    const res = await POST(req({ records: [{
      table: 'document_tag', id: 'x', op: 'upsert',
      data: { documentId: 'victim-doc', tagId: 't1' }, syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'document_tag', reason: 'not_found' });
    expect(create).not.toHaveBeenCalled();
  });

  it('放行：所有者对自己文档的 document_member 增删照常落库', async () => {
    const { create } = scopedDb({
      documents: [{ id: 'my-doc', userId: 'u1', isDeleted: false }],
    });
    const res = await POST(req({ records: [{
      table: 'document_member', id: 'm-1', op: 'upsert',
      data: { documentId: 'my-doc', userId: 'friend', role: 'editor' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([{ table: 'document_member', id: 'm-1' }]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  /**
   * G1627——成员行 `(documentId, userId)` 是唯一键。所有者在两台设备上几乎同时加同一个人，
   * 两笔 `resolveDocumentMember` 各发一枚 uuid（那一次都读到"还没有这一行"）⇒ 第二笔推送按
   * pk 定位不到、按唯一键才撞得上：盲 create 抛唯一约束 → 事务 aborted（25P02）⇒ 整批 500
   * 且客户端无限重推同一笔（G1625／G1626 同族）。定位器按 `(documentId, userId)` 回读，
   * 把这一笔并到存量行、跑同一条 decideLww。
   */
  it('G1627：document_member 撞 (documentId,userId) 唯一键 → 并到存量行（不 create、不 500）', async () => {
    const { create, update } = scopedDb({
      documents: [{ id: 'my-doc', userId: 'u1', isDeleted: false }],
      members: [{
        id: 'm-old', documentId: 'my-doc', userId: 'friend', role: 'viewer',
        createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-28T09:00:00.000Z',
      }],
    });

    // 本机较新（12:00 > 09:00）⇒ 改档落到存量行，applied 报存量行的权威 id
    const res = await POST(req({ records: [{
      table: 'document_member', id: 'm-new', op: 'upsert',
      data: { documentId: 'my-doc', userId: 'friend', role: 'editor' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.applied).toEqual([{ table: 'document_member', id: 'm-old' }]);
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ role: 'editor' }));
    // 不动存量行主键
    expect(update.mock.calls[0]![0]).not.toHaveProperty('id');

    // 本机更旧（08:00 < 09:00）⇒ 回传现值，仍 200 且不写
    update.mockClear();
    const stale = await POST(req({ records: [{
      table: 'document_member', id: 'm-new2', op: 'upsert',
      data: { documentId: 'my-doc', userId: 'friend', role: 'editor' },
      syncTs: '2026-09-28T08:00:00.000Z',
    }] }));
    const staleBody = await stale.json();
    expect(staleBody.applied).toEqual([]);
    expect(staleBody.rejected[0]).toMatchObject({ id: 'm-new2', reason: 'stale' });
    // 权威 id 走 data（客户端据此把本地那枚旧 id 换掉）
    expect(staleBody.rejected[0].data.id).toBe('m-old');
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('放行：editor 成员对本文档挂标签（档位＝editor）', async () => {
    const { create } = scopedDb({
      documents: [{ id: 'shared-doc', userId: 'owner-elsewhere', isDeleted: false }],
      members: [{ id: 'm-1', documentId: 'shared-doc', userId: 'u1', role: 'editor' }],
      tags: [{ id: 't1', userId: 'owner-elsewhere' }],
    });
    const res = await POST(req({ records: [{
      table: 'document_tag', id: 'x', op: 'upsert',
      data: { documentId: 'shared-doc', tagId: 't1' }, syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([{ table: 'document_tag', id: 'shared-doc__t1' }]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('拒收：viewer 成员想改分享档位（档位＝owner）→ not_found', async () => {
    const { create } = scopedDb({
      documents: [{ id: 'shared-doc', userId: 'owner-elsewhere', isDeleted: false }],
      members: [{ id: 'm-1', documentId: 'shared-doc', userId: 'u1', role: 'viewer' }],
    });
    const res = await POST(req({ records: [{
      table: 'document_share', id: 's-1', op: 'upsert',
      data: { documentId: 'shared-doc', permission: 'edit' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'document_share', reason: 'not_found' });
    expect(create).not.toHaveBeenCalled();
  });

  it('放行：commenter 成员发评论（档位＝commenter）', async () => {
    const { create } = scopedDb({
      documents: [{ id: 'shared-doc', userId: 'owner-elsewhere', isDeleted: false }],
      members: [{ id: 'm-1', documentId: 'shared-doc', userId: 'u1', role: 'commenter' }],
    });
    const res = await POST(req({ records: [{
      table: 'comment_thread', id: 'th-1', op: 'upsert',
      data: { documentId: 'shared-doc', blockText: 'x', resolved: false },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([{ table: 'comment_thread', id: 'th-1' }]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('拒收：viewer 成员想发评论（档位＝commenter）→ not_found', async () => {
    const { create } = scopedDb({
      documents: [{ id: 'shared-doc', userId: 'owner-elsewhere', isDeleted: false }],
      members: [{ id: 'm-1', documentId: 'shared-doc', userId: 'u1', role: 'viewer' }],
    });
    const res = await POST(req({ records: [{
      table: 'comment_thread', id: 'th-1', op: 'upsert',
      data: { documentId: 'shared-doc', blockText: 'x', resolved: false },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'comment_thread', reason: 'not_found' });
    expect(create).not.toHaveBeenCalled();
  });

  it('拒收：upsert 带不出 documentId、服务端也定位不到行 → not_found（不铸无归属的壳）', async () => {
    const { create } = scopedDb({ documents: [], members: [] });
    const res = await POST(req({ records: [{
      table: 'document_member', id: 'ghost-1', op: 'upsert',
      data: { userId: 'u1', role: 'editor' }, syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'document_member', reason: 'not_found' });
    expect(create).not.toHaveBeenCalled();
  });

  it('放行：delete 定位不到行属于幂等 no-op（不带 documentId 的陈旧删除不报错）', async () => {
    const { update } = scopedDb({ documents: [], members: [] });
    const res = await POST(req({ records: [{
      table: 'document_member', id: 'gone-1', op: 'delete', syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.applied).toEqual([{ table: 'document_member', id: 'gone-1' }]);
    expect(update).not.toHaveBeenCalled();
  });

  it('放行：delete 带 documentId 且是所有者 → 正常落库（document_member 无 deletedAt ⇒ 硬删）', async () => {
    const { update, del } = scopedDb({
      documents: [{ id: 'my-doc', userId: 'u1', isDeleted: false }],
      members: [{ id: 'm-1', documentId: 'my-doc', userId: 'friend', role: 'editor',
        createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-28T09:00:00.000Z' }],
    });
    const res = await POST(req({ records: [{
      table: 'document_member', id: 'm-1', op: 'delete',
      data: { documentId: 'my-doc' }, syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect((await res.json()).applied).toEqual([{ table: 'document_member', id: 'm-1' }]);
    // G1521：document_member 的 cols 无 deletedAt／isDeleted ⇒ 不能 update 墓碑（会抛
    // unknown column），必须走真删除
    expect(update).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalledTimes(1);
  });

  it('拒收：delete 带 documentId 但是别人文档 → not_found，不写墓碑', async () => {
    const { update } = scopedDb({
      documents: [{ id: 'victim-doc', userId: 'owner-elsewhere', isDeleted: false }],
    });
    const res = await POST(req({ records: [{
      table: 'document_member', id: 'm-9', op: 'delete',
      data: { documentId: 'victim-doc' }, syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'document_member', reason: 'not_found' });
    expect(update).not.toHaveBeenCalled();
  });
});

/**
 * G1628——作用域鉴权的两处缺口（与 G1523 同族，只是换了两副面孔）：
 * ① **集合四表 POST 侧一次都没校验**：`collection_item`／`collection_property`／
 *    `collection_view`／`collection_value` 都不在 `USER_ID_TABLES` 里（前三个没有 userId 列，
 *    最后一个连 collectionId 都没有、要经 itemId 两跳），where 只剩 `{id}` ⇒ 任何登录用户
 *    POST 一枚 `collection_property{collectionId: 别人集合, name: 'x'}` 就能往别人集合里塞字段，
 *    或者拿别人字段行的 id 一枚 `{name: '改了'}` 直接把人家字段改名。
 * ② **文档侧只信内联 documentId**：`{id: 别人分享行的 id, documentId: 我的文档, permission: 'edit'}`
 *    的鉴权在自己的文档上通过，紧接着 `first({id})` 命中的却是别人那行 ⇒ update 落到别人的分享档。
 * 两处的判据同一条：**这一笔自带的归属与它按 pk 实际命中的那行不一致，就没有第三种解释，拒**。
 */
describe('POST /api/v1/sync — G1628 集合写侧鉴权与归属不符', () => {
  beforeEach(() => vi.clearAllMocks());

  function collDb(opts: {
    collections?: Record<string, unknown>[];
    items?: Record<string, unknown>[];
    properties?: Record<string, unknown>[];
    values?: Record<string, unknown>[];
    shares?: Record<string, unknown>[];
    documents?: Record<string, unknown>[];
  }) {
    const create = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const del = vi.fn(async () => ({}));
    const makeTable = (rows: Record<string, unknown>[]) => {
      const t: any = {
        where: () => t,
        first: async (where: Record<string, unknown>) =>
          rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
        create,
        update,
        delete: del,
      };
      return t;
    };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) =>
        m === 'SyncEvent' ? { create: vi.fn() }
          : m === 'Collection' ? makeTable(opts.collections ?? [])
            : m === 'CollectionItem' ? makeTable(opts.items ?? [])
              : m === 'CollectionProperty' ? makeTable(opts.properties ?? [])
                : m === 'CollectionValue' ? makeTable(opts.values ?? [])
                  : m === 'DocumentShare' ? makeTable(opts.shares ?? [])
                    : m === 'Document' ? makeTable(opts.documents ?? [])
                      : makeTable([]),
    }) } });
    return { create, update, del };
  }

  it('拒收：往别人集合里塞字段（collection_property upsert，collectionId 属他人）→ not_found 不 create', async () => {
    const { create } = collDb({ collections: [{ id: 'victim-coll', userId: 'owner-elsewhere', isDeleted: false }] });
    const res = await POST(req({ records: [{
      table: 'collection_property', id: 'p-new', op: 'upsert',
      data: { collectionId: 'victim-coll', name: '新字段', type: 'text' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'collection_property', reason: 'not_found' });
    expect(create).not.toHaveBeenCalled();
  });

  it('拒收：拿别人字段行的 id 只带一枚 patch（collectionId 是行自带的他人集合）→ 不改档', async () => {
    const { update } = collDb({
      collections: [{ id: 'victim-coll', userId: 'owner-elsewhere', isDeleted: false }],
      properties: [{ id: 'p-victim', collectionId: 'victim-coll', name: '原来的', type: 'text',
        updatedAt: '2026-09-28T09:00:00.000Z' }],
    });
    const res = await POST(req({ records: [{
      table: 'collection_property', id: 'p-victim', op: 'upsert',
      data: { name: '被改了' }, syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'collection_property', reason: 'not_found' });
    expect(update).not.toHaveBeenCalled();
  });

  it('拒收：内联 collectionId 与命中行不符（拿别人行 id + 自己的集合）→ 不 update', async () => {
    const { update } = collDb({
      collections: [{ id: 'my-coll', userId: 'u1', isDeleted: false }],
      properties: [{ id: 'p-victim', collectionId: 'victim-coll', name: '原来的', type: 'text',
        updatedAt: '2026-09-28T09:00:00.000Z' }],
    });
    const res = await POST(req({ records: [{
      table: 'collection_property', id: 'p-victim', op: 'upsert',
      data: { collectionId: 'my-coll', name: '被改了' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'collection_property', reason: 'not_found' });
    expect(update).not.toHaveBeenCalled();
  });

  it('拒收：collection_value 两跳落在别人集合（itemId 属他人条目）→ not_found 不 create', async () => {
    const { create } = collDb({
      collections: [{ id: 'victim-coll', userId: 'owner-elsewhere', isDeleted: false }],
      items: [{ id: 'victim-item', collectionId: 'victim-coll' }],
    });
    const res = await POST(req({ records: [{
      table: 'collection_value', id: 'v-new', op: 'upsert',
      data: { itemId: 'victim-item', propertyId: 'p1', value: '偷写' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'collection_value', reason: 'not_found' });
    expect(create).not.toHaveBeenCalled();
  });

  it('拒收：collection_item 的陈旧删除落在别人集合 → not_found，不写墓碑', async () => {
    const { update } = collDb({
      collections: [{ id: 'victim-coll', userId: 'owner-elsewhere', isDeleted: false }],
      items: [{ id: 'victim-item', collectionId: 'victim-coll', updatedAt: '2026-09-28T09:00:00.000Z' }],
    });
    const res = await POST(req({ records: [{
      table: 'collection_item', id: 'victim-item', op: 'delete',
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'collection_item', reason: 'not_found' });
    expect(update).not.toHaveBeenCalled();
  });

  it('拒收：别人的分享行 id 配自己的 documentId（旧实现只信内联归属）→ 不改别人的档位', async () => {
    const { update } = collDb({
      documents: [{ id: 'my-doc', userId: 'u1', isDeleted: false }],
      shares: [{ id: 's-victim', documentId: 'victim-doc', permission: 'view',
        updatedAt: '2026-09-28T09:00:00.000Z' }],
    });
    const res = await POST(req({ records: [{
      table: 'document_share', id: 's-victim', op: 'upsert',
      data: { documentId: 'my-doc', permission: 'edit', shareVersion: 9 },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'document_share', reason: 'not_found' });
    expect(update).not.toHaveBeenCalled();
  });

  it('放行：自己集合里的字段新建 / 取值 / 级联墓碑照常落库', async () => {
    const { create, update } = collDb({
      collections: [{ id: 'my-coll', userId: 'u1', isDeleted: false }],
      items: [{ id: 'my-item', collectionId: 'my-coll', updatedAt: '2026-09-01T00:00:00.000Z' }],
      values: [{ id: 'v-old', itemId: 'my-item', propertyId: 'p-old', value: '旧值',
        updatedAt: '2026-09-01T00:00:00.000Z' }],
    });
    const res = await POST(req({ records: [
      { table: 'collection_property', id: 'p-new', op: 'upsert',
        data: { collectionId: 'my-coll', name: '新字段', type: 'text' },
        syncTs: '2026-09-28T12:00:00.000Z' },
      { table: 'collection_value', id: 'v-new', op: 'upsert',
        data: { itemId: 'my-item', propertyId: 'p-new', value: '值' },
        syncTs: '2026-09-28T12:00:00.000Z' },
      // FieldMenu 的级联墓碑：upsert 只带 deletedAt，归属由存量行自带
      { table: 'collection_value', id: 'v-old', op: 'upsert',
        data: { deletedAt: '2026-09-28T12:00:00.000Z' },
        syncTs: '2026-09-28T12:00:00.000Z' },
    ] }));
    const body = await res.json();
    expect(body.rejected).toEqual([]);
    expect(body.applied.map((r: any) => r.table)).toEqual([
      'collection_property', 'collection_value', 'collection_value',
    ]);
    expect(create).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('放行：成员推自己的分享行（id 与 documentId 一致且是本人可写的文档）', async () => {
    const { update } = collDb({
      documents: [{ id: 'my-doc', userId: 'u1', isDeleted: false }],
      shares: [{ id: 's-1', documentId: 'my-doc', permission: 'view',
        updatedAt: '2026-09-28T09:00:00.000Z' }],
    });
    const res = await POST(req({ records: [{
      table: 'document_share', id: 's-1', op: 'upsert',
      data: { permission: 'edit', shareVersion: 2 },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect((await res.json()).applied).toEqual([{ table: 'document_share', id: 's-1' }]);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ permission: 'edit' }));
  });
});

/**
 * G1629——值类型闸。`recordSchema` 只约束 `data` 是 `Record<string, unknown>`，每一列的类型
 * 此前一律交给 Postgres：一枚 `{isDeleted:'yes'}` 绑不进 bool 列 ⇒ 语句报错 ⇒ 事务进 aborted
 * 态（25P02）⇒ 整批 500 ⇒ 客户端无限重推同一笔（G1625 家族第四副面孔）。这类笔**永远不可能
 * 成功**，必须单独拒掉、让客户端丢它，同批其余照常落地。
 */
describe('POST /api/v1/sync — G1629 值类型闸', () => {
  beforeEach(() => vi.clearAllMocks());

  it('坏值单独拒收（reason=invalid），同批好值照常落库', async () => {
    const create = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const first = vi.fn(async (_where: Record<string, unknown>): Promise<any> => null);
    const chain = { where: () => chain, first, update, create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [
      // 1) 坏值：bool 列收到字符串
      { table: 'whiteboard', id: 'wb-bad', op: 'upsert',
        data: { name: '板子', isDeleted: 'yes' }, syncTs: '2026-09-28T12:00:00.000Z' },
      // 2) 坏值：int4 列收到小数
      { table: 'collection_property', id: 'p-bad', op: 'upsert',
        data: { collectionId: 'c1', name: '字段', type: 'text', order: 1.5 },
        syncTs: '2026-09-28T12:00:00.000Z' },
      // 3) 坏值：非空列收到 null
      { table: 'document', id: 'd-bad', op: 'upsert',
        data: { title: null }, syncTs: '2026-09-28T12:00:00.000Z' },
      // 4) 好值：同批照常过
      { table: 'document', id: 'd-good', op: 'upsert',
        data: { title: '', parentId: null }, syncTs: '2026-09-28T12:00:00.000Z' },
    ] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.applied).toEqual([{ table: 'document', id: 'd-good' }]);
    expect(body.rejected.map((r: any) => [r.table, r.reason])).toEqual([
      ['whiteboard', 'invalid'],
      ['collection_property', 'invalid'],
      ['document', 'invalid'],
    ]);
    // 坏值一个字节都不写；只有好值那一笔 create
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]![0]).toMatchObject({ title: '' });
  });

  it('delete 的 data 不参与写入 ⇒ 不按值类型闸拒（陈旧删除照旧幂等放行）', async () => {
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const first = vi.fn(async (_where: Record<string, unknown>): Promise<any> => null);
    const chain = { where: () => chain, first, update, create: vi.fn() };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [{
      table: 'folder', id: 'f-gone', op: 'delete',
      data: { isDeleted: 'yes' }, syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([{ table: 'folder', id: 'f-gone' }]);
    expect(body.rejected).toEqual([]);
  });
});

/**
 * G1638——客户端时间戳的**未来界**。`syncTs` 来自设备自己的钟，服务端此前原样采信
 * （G1511③ 的 `max(serverNow, rec.syncTs)` 只会把它抬得更远）：一台时间调到 2099 的设备
 * 能把行写成未来时刻 ⇒ GET 的续传游标（各行时间戳的最大值）跳到未来 ⇒ 之后所有正常时刻的
 * 改动都被 since 谓词永久跳过、同一行也被 LWW 永久压死（`tCli <= tSrv` 永远成立）。
 * 修法＝**落库值**钳到服务端此刻；客户端原值仍参与 LWW 判旧。
 */
describe('POST /api/v1/sync — G1638 未来时间戳钳到服务端此刻', () => {
  beforeEach(() => vi.clearAllMocks());

  function tsDb(existing: Record<string, unknown> | null = null) {
    const create = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const first = vi.fn(async (_where: Record<string, unknown>): Promise<any> => existing);
    const chain = { where: () => chain, first, update, create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });
    return { create, update };
  }

  const before = Date.now();

  it('落在未来的 syncTs ⇒ 落库时间戳被钳到此刻（不再把续传游标推到未来）', async () => {
    const { create } = tsDb();
    const res = await POST(req({ records: [{
      table: 'document', id: 'd-future', op: 'upsert',
      data: { title: '来自 2099' }, syncTs: '2099-05-01T12:00:00.000Z',
    }] }));
    expect((await res.json()).applied).toEqual([{ table: 'document', id: 'd-future' }]);
    const stored = new Date(create.mock.calls[0]![0].metaUpdatedAt as string).getTime();
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored, '未来戳被原样采信＝游标会跳到未来、之后的写全部被跳过').toBeLessThanOrEqual(Date.now() + 1_000);
  });

  it('落后的 syncTs 仍按 max 抬到服务端此刻（G1511③ 的原语义没有回退）', async () => {
    const { update } = tsDb({
      id: 'd1', title: '旧', metaUpdatedAt: '2026-11-16T00:00:00.000Z', updatedAt: '2026-11-16T00:00:00.000Z',
    });
    await POST(req({ records: [{
      table: 'document', id: 'd1', op: 'upsert', data: { title: '新' }, syncTs: '2026-11-16T03:00:00.000Z',
    }] }));
    const stored = new Date(update.mock.calls[0]![0].metaUpdatedAt as string).getTime();
    expect(stored).toBeGreaterThanOrEqual(before);
  });

  it('未来戳仍然参与 LWW 判旧：比它旧的存量行照样被这一笔盖掉', async () => {
    // 存量 2026-09 的行、客户端报 2099 ⇒ 判旧用的是客户端原值（apply），不是钳后的此刻
    const { update } = tsDb({
      id: 'd1', title: '旧', metaUpdatedAt: '2026-09-28T00:00:00.000Z', updatedAt: '2026-09-28T00:00:00.000Z',
    });
    await POST(req({ records: [{
      table: 'document', id: 'd1', op: 'upsert', data: { title: '新' }, syncTs: '2099-01-01T00:00:00.000Z',
    }] }));
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('未来戳的墓碑也只写此刻（deletedAt / tsCol 同一个值）', async () => {
    const { update } = tsDb({
      id: 'd1', title: '旧', metaUpdatedAt: '2026-09-28T00:00:00.000Z', updatedAt: '2026-09-28T00:00:00.000Z',
      deletedAt: null,
    });
    await POST(req({ records: [{
      table: 'document', id: 'd1', op: 'delete', syncTs: '2099-01-01T00:00:00.000Z',
    }] }));
    const patch = update.mock.calls[0]![0];
    expect(new Date(patch.metaUpdatedAt as string).getTime()).toBeLessThanOrEqual(Date.now() + 1_000);
    expect(patch.deletedAt).toBe(patch.metaUpdatedAt);
  });
});

/**
 * G1633——`comment` 的写侧归属。它是同步表里**唯一**"有 userId 列、但 userId 是写入者而不是
 * 归属人"的表：`where` 收窄的只是"这行是谁写的"，`threadId` 指向的线程属于谁一次都没判。
 * 于是任何登录用户 POST 一枚 `comment{threadId: 别人线程, body}` 都能铸出一条自己的评论行，
 * 而 `getThreads` 按 `threadIds` 读回**全部作者**的行 ⇒ 别人的文档里出现陌生人插的话。
 * 判据与 G1523／G1628 同形：归属从 `threadId` 两跳到文档，档位＝commenter（与 addReply 同档）。
 */
describe('POST /api/v1/sync — G1633 评论写侧归属（threadId 两跳）', () => {
  beforeEach(() => vi.clearAllMocks());

  function commentDb(opts: {
    documents?: Record<string, unknown>[];
    members?: Record<string, unknown>[];
    threads?: Record<string, unknown>[];
    comments?: Record<string, unknown>[];
  }) {
    const create = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const makeTable = (rows: Record<string, unknown>[]) => {
      const t: any = {
        where: () => t,
        first: async (where: Record<string, unknown>) =>
          rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
        create,
        update,
        delete: async () => ({}),
      };
      return t;
    };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) =>
        m === 'SyncEvent' ? { create: vi.fn() }
          : m === 'Document' ? makeTable(opts.documents ?? [])
            : m === 'DocumentMember' ? makeTable(opts.members ?? [])
              : m === 'CommentThread' ? makeTable(opts.threads ?? [])
                : m === 'Comment' ? makeTable(opts.comments ?? [])
                  : makeTable([]),
    }) } });
    return { create, update };
  }

  const thread = (id: string, documentId: string, deletedAt: string | null = null) => ({
    id, documentId, blockText: 'x', resolved: false, deletedAt,
    updatedAt: '2026-09-28T09:00:00.000Z',
  });

  it('拒收：往别人文档的评论线程里插话 → not_found，不 create', async () => {
    const { create } = commentDb({
      documents: [{ id: 'victim-doc', userId: 'owner-elsewhere', isDeleted: false }],
      threads: [thread('victim-th', 'victim-doc')],
    });
    const res = await POST(req({ records: [{
      table: 'comment', id: 'c-forged', op: 'upsert',
      data: { threadId: 'victim-th', body: '我没被邀请' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([]);
    expect(body.rejected).toEqual([{
      table: 'comment', id: 'c-forged', op: 'delete',
      syncTs: '2026-09-28T12:00:00.000Z', reason: 'not_found',
    }]);
    expect(create).not.toHaveBeenCalled();
  });

  it('拒收：只有 viewer 档的成员想插话 → not_found（档位＝commenter）', async () => {
    const { create } = commentDb({
      documents: [{ id: 'shared-doc', userId: 'owner-elsewhere', isDeleted: false }],
      members: [{ id: 'm-1', documentId: 'shared-doc', userId: 'u1', role: 'viewer' }],
      threads: [thread('th-1', 'shared-doc')],
    });
    const res = await POST(req({ records: [{
      table: 'comment', id: 'c-viewer', op: 'upsert',
      data: { threadId: 'th-1', body: '只读也想说话' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.rejected[0]).toMatchObject({ table: 'comment', reason: 'not_found' });
    expect(create).not.toHaveBeenCalled();
  });

  it('拒收：拿自己的评论行 id 把 threadId 挪到别人的线程（内联与存量行不符）→ 不改', async () => {
    const { update } = commentDb({
      threads: [thread('my-th', 'my-doc'), thread('victim-th', 'victim-doc')],
      comments: [{ id: 'c-mine', threadId: 'my-th', userId: 'u1', body: '原文',
        updatedAt: '2026-09-28T09:00:00.000Z' }],
    });
    const res = await POST(req({ records: [{
      table: 'comment', id: 'c-mine', op: 'upsert',
      data: { threadId: 'victim-th', body: '挪过去' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.rejected[0]).toMatchObject({ table: 'comment', reason: 'not_found' });
    expect(update).not.toHaveBeenCalled();
  });

  it('拒收：线程不存在（陈旧 id 上凭空铸评论）→ not_found，不 create', async () => {
    const { create } = commentDb({ documents: [], threads: [] });
    const res = await POST(req({ records: [{
      table: 'comment', id: 'c-orphan', op: 'upsert',
      data: { threadId: 'th-gone', body: '孤儿' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect((await res.json()).rejected[0]).toMatchObject({ table: 'comment', reason: 'not_found' });
    expect(create).not.toHaveBeenCalled();
  });

  it('放行：commenter 成员在共享文档的线程里发言 → create', async () => {
    const { create } = commentDb({
      documents: [{ id: 'shared-doc', userId: 'owner-elsewhere', isDeleted: false }],
      members: [{ id: 'm-1', documentId: 'shared-doc', userId: 'u1', role: 'commenter' }],
      threads: [thread('th-1', 'shared-doc')],
    });
    const res = await POST(req({ records: [{
      table: 'comment', id: 'c-ok', op: 'upsert',
      data: { threadId: 'th-1', body: '同意' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([{ table: 'comment', id: 'c-ok' }]);
    expect(create).toHaveBeenCalledTimes(1);
    // 写入者仍是会话用户（userId 由服务端覆盖，不取 payload）
    expect(create.mock.calls[0]![0]).toMatchObject({ threadId: 'th-1', userId: 'u1' });
  });

  it('放行：线程已被软删时，自己的评论删除照旧幂等收口（不因归属读不到而卡队列）', async () => {
    const { update } = commentDb({
      threads: [thread('gone-th', 'my-doc', '2026-09-28T10:00:00.000Z')],
      comments: [{ id: 'c-old', threadId: 'gone-th', userId: 'u1', body: '原文',
        updatedAt: '2026-09-28T09:00:00.000Z' }],
    });
    const res = await POST(req({ records: [{
      table: 'comment', id: 'c-old', op: 'delete',
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect((await res.json()).applied).toEqual([{ table: 'comment', id: 'c-old' }]);
    expect(update).toHaveBeenCalledTimes(1);
  });
});

/**
 * G1640——表情从"评论行上的一枚 JSON 数组"拆成**每人一行**（`comment_reaction`）。
 * 旧形状下协作者对别人的评论加表情只能走"替行主改整行"的分支（G1636 的按人切片），
 * 而那是为了绕开载体才有的折中；拆表后每一行只属于一个人：写侧天然收窄到本人、
 * 两人同时各加一枚也不再互相覆盖，`where {id,userId}` 重新成为唯一语义。
 */
describe('POST /api/v1/sync — G1640 表情行（per-user）', () => {
  beforeEach(() => vi.clearAllMocks());

  function reactionDb(opts: {
    documents?: Record<string, unknown>[];
    members?: Record<string, unknown>[];
    threads?: Record<string, unknown>[];
    comments?: Record<string, unknown>[];
    reactions?: Record<string, unknown>[];
  }) {
    const create = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const update = vi.fn(async (_payload: Record<string, unknown>) => ({}));
    const del = vi.fn(async () => ({}));
    const makeTable = (rows: Record<string, unknown>[]) => {
      const t: any = {
        where: () => t,
        first: async (where: Record<string, unknown>) =>
          rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
        create,
        update,
        delete: del,
      };
      return t;
    };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) =>
        m === 'SyncEvent' ? { create: vi.fn() }
          : m === 'Document' ? makeTable(opts.documents ?? [])
            : m === 'DocumentMember' ? makeTable(opts.members ?? [])
              : m === 'CommentThread' ? makeTable(opts.threads ?? [])
                : m === 'Comment' ? makeTable(opts.comments ?? [])
                  : m === 'CommentReaction' ? makeTable(opts.reactions ?? [])
                    : makeTable([]),
    }) } });
    return { create, update, del };
  }

  const thread = (id: string, documentId: string) => ({
    id, documentId, blockText: 'x', resolved: false, deletedAt: null,
    updatedAt: '2026-09-28T09:00:00.000Z',
  });
  const theirComment = () => ({
    id: 'c-theirs', threadId: 'th-1', userId: 'owner-elsewhere', body: '别人的评论',
    updatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null,
  });
  const shared = () => ({
    documents: [{ id: 'shared-doc', userId: 'owner-elsewhere', isDeleted: false }],
    members: [{ id: 'm-1', documentId: 'shared-doc', userId: 'u1', role: 'commenter' }],
    threads: [thread('th-1', 'shared-doc')],
    comments: [theirComment()],
  });

  it('放行：commenter 对**别人的**评论加表情 → create 一行，userId 盖成会话用户', async () => {
    const { create } = reactionDb(shared());
    const res = await POST(req({ records: [{
      table: 'comment_reaction', id: 'r-new', op: 'upsert',
      data: { commentId: 'c-theirs', glyph: '👍', name: '我' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([{ table: 'comment_reaction', id: 'r-new' }]);
    expect(create).toHaveBeenCalledTimes(1);
    const row = create.mock.calls[0]![0];
    expect(row).toMatchObject({ commentId: 'c-theirs', glyph: '👍', userId: 'u1' });
    // 表情行不碰评论行：没有回写 comment 的 update
    expect(row).not.toHaveProperty('body');
  });

  it('放行：取消表情＝给**自己那一行**写墓碑（别人的行读不到，写不了）', async () => {
    const { update } = reactionDb({
      ...shared(),
      reactions: [{ id: 'r-mine', commentId: 'c-theirs', userId: 'u1', glyph: '👍', name: '我',
        updatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null }],
    });
    const res = await POST(req({ records: [{
      table: 'comment_reaction', id: 'r-mine', op: 'upsert',
      data: { commentId: 'c-theirs', deletedAt: '2026-09-28T12:00:00.000Z' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect((await res.json()).applied).toEqual([{ table: 'comment_reaction', id: 'r-mine' }]);
    expect(update.mock.calls[0]![0]).toMatchObject({ deletedAt: '2026-09-28T12:00:00.000Z' });
  });

  it('拒收：拿别人的表情行 id 来写自己那一版 → not_found（where 带会话 userId）', async () => {
    const { update } = reactionDb({
      ...shared(),
      reactions: [{ id: 'r-theirs', commentId: 'c-theirs', userId: 'owner-elsewhere', glyph: '🎉', name: '别人',
        updatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null }],
    });
    const res = await POST(req({ records: [{
      table: 'comment_reaction', id: 'r-theirs', op: 'upsert',
      data: { commentId: 'c-theirs', glyph: '🔥' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.rejected[0]).toMatchObject({ table: 'comment_reaction', reason: 'not_found' });
    expect(update).not.toHaveBeenCalled();
  });

  it('拒收：viewer 档加表情 → not_found（归属三跳后的档位仍是 commenter）', async () => {
    const { create } = reactionDb({
      ...shared(),
      members: [{ id: 'm-1', documentId: 'shared-doc', userId: 'u1', role: 'viewer' }],
    });
    const res = await POST(req({ records: [{
      table: 'comment_reaction', id: 'r-viewer', op: 'upsert',
      data: { commentId: 'c-theirs', glyph: '👍' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect((await res.json()).rejected[0]).toMatchObject({ table: 'comment_reaction', reason: 'not_found' });
    expect(create).not.toHaveBeenCalled();
  });

  it('拒收：往不存在的评论上挂表情 → not_found，不 create', async () => {
    const { create } = reactionDb({ threads: [thread('th-1', 'my-doc')], comments: [] });
    const res = await POST(req({ records: [{
      table: 'comment_reaction', id: 'r-ghost', op: 'upsert',
      data: { commentId: 'c-ghost', glyph: '👍' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect((await res.json()).rejected[0]).toMatchObject({ table: 'comment_reaction', reason: 'not_found' });
    expect(create).not.toHaveBeenCalled();
  });

  it('拒收：同 (commentId,userId,glyph) 撞唯一键 → 并到存量行（不 create、不 500）', async () => {
    const { create, update } = reactionDb({
      ...shared(),
      reactions: [{ id: 'r-old', commentId: 'c-theirs', userId: 'u1', glyph: '👍', name: '旧名',
        updatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null }],
    });
    const res = await POST(req({ records: [{
      table: 'comment_reaction', id: 'r-new', op: 'upsert',
      data: { commentId: 'c-theirs', glyph: '👍', name: '新名' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(body.applied).toEqual([{ table: 'comment_reaction', id: 'r-old' }]);
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: '新名' }));
    expect(update.mock.calls[0]![0]).not.toHaveProperty('id');
  });

  it('放行：自己评论上的表情行（归属三跳在本机文档上同样成立）', async () => {
    const { create } = reactionDb({
      documents: [{ id: 'my-doc', userId: 'u1', isDeleted: false }],
      threads: [thread('th-1', 'my-doc')],
      comments: [{ id: 'c-mine', threadId: 'th-1', userId: 'u1', body: '我的评论',
        updatedAt: '2026-09-28T09:00:00.000Z', deletedAt: null }],
    });
    const res = await POST(req({ records: [{
      table: 'comment_reaction', id: 'r-own', op: 'upsert',
      data: { commentId: 'c-mine', glyph: '🎉', name: '我' },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect((await res.json()).applied).toEqual([{ table: 'comment_reaction', id: 'r-own' }]);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
