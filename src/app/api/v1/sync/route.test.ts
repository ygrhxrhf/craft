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

  it('R-10 I-1：document_tag 复合键取自 data——applied id 与 cursor 为 documentId__tagId', async () => {
    const create = vi.fn(async () => ({}));
    const chain = { where: () => chain, first: vi.fn(async () => null), update: vi.fn(), create };
    // G1523 写侧鉴权要读 Document 判归属：这一篇归会话用户 u1（所有者）
    const docChain = { first: vi.fn(async () => ({ id: 'd1', userId: 'u1', isDeleted: false })) };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, { get: (_t, m) => m === 'SyncEvent' ? { create } : m === 'Document' ? docChain : chain }) } });

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
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const res = await POST(req({ records: [{
      // 用 favorite（无 createRequirements，单点动作本就是建行）：走到 create 抛错 ⇒ 整批 500。
      // folder 现在配了闸，改名 patch 会被判 not_found、到不了 create —— 那由 G1513 那组用例覆盖。
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

  it('G1505 闸按表配置：favorite 无 createRequirements，陈旧行仍按既有语义建行（不整体锁死）', async () => {
    const create = vi.fn(async () => ({}));
    const first = vi.fn(async () => null);
    const chain = { where: () => chain, first, update: vi.fn(), create };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    // favorite 的"单点动作＝收藏"本就是建行语义 ⇒ 不许配闸（配了会把离线收藏判成 not_found）
    const res = await POST(req({ records: [{
      table: 'favorite', id: 'fav9', op: 'upsert', data: { documentId: 'd1', deletedAt: null },
      syncTs: '2026-09-28T12:00:00.000Z',
    }] }));
    expect(res.status).toBe(200);
    expect((await res.json()).applied).toHaveLength(1);
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
  it('G1511③：客户端 syncTs 更新时，落库时间戳取 max(serverNow, rec.syncTs)', async () => {
    const update = vi.fn(async () => ({}));
    const rows = [{ id: 'fut', title: 'old',
      updatedAt: '2026-09-28T10:00:00.000Z', metaUpdatedAt: '2026-09-28T10:00:00.000Z',
      deletedAt: null }];
    const chain = { where: () => chain, first: async ({ id }: any) => rows.find(r => r.id === id) ?? null, update, create: vi.fn() };
    (getDb as any).mockResolvedValue({ orm: { public: new Proxy({}, {
      get: (_t, m) => (m === 'SyncEvent' ? { create: vi.fn() } : chain),
    }) } });

    const future = '2099-01-01T00:00:00.000Z';
    const res = await POST(req({ records: [
      { table: 'document', id: 'fut', op: 'upsert', data: { title: 'new' }, syncTs: future },
    ] }));
    const body = await res.json();
    expect(body.applied).toHaveLength(1);
    // 落库那笔的 metaUpdatedAt 就是客户端给的那枚（服务端没有把它拖回"此刻"）
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ metaUpdatedAt: future }));
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
  }) {
    const create = vi.fn(async () => ({}));
    const update = vi.fn(async () => ({}));
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

  it('放行：editor 成员对本文档挂标签（档位＝editor）', async () => {
    const { create } = scopedDb({
      documents: [{ id: 'shared-doc', userId: 'owner-elsewhere', isDeleted: false }],
      members: [{ id: 'm-1', documentId: 'shared-doc', userId: 'u1', role: 'editor' }],
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
