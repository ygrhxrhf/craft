import { describe, it, expect, vi } from 'vitest';
import { createReconciler, SyncAuthError } from './reconciler';
import { createMemoryStore } from './store';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('reconciler.pull', () => {
  it('hasMore 循环拉完，每批即应用并推进 cursor', async () => {
    const store = await createMemoryStore(); await store.init();
    const pages = [
      ok({ records: [{ table: 'folder', id: 'f1', op: 'upsert', data: { name: 'a' }, syncTs: '2026-09-28T10:00:00.000Z' }],
           cursor: '2026-09-28T10:00:00.000Z|f1', hasMore: true }),
      ok({ records: [{ table: 'folder', id: 'f2', op: 'upsert', data: { name: 'b' }, syncTs: '2026-09-28T10:00:01.000Z' }],
           cursor: '2026-09-28T10:00:01.000Z|f2', hasMore: false }),
    ];
    const fetchImpl = vi.fn(async () => pages.shift()!);
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    const out = await r.pull();
    expect(out.applied).toBe(2);
    expect(await store.get('folder', 'f1')).not.toBeNull();
    expect(await store.getCursor()).toEqual({ ts: '2026-09-28T10:00:01.000Z', id: 'f2' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // 第二次请求带上了第一页的 cursor
    expect((fetchImpl.mock.calls[1] as any)[0]).toContain('since=' +
      encodeURIComponent('2026-09-28T10:00:00.000Z|f1'));
  });

  it('full 模式（首轮）：本地存在而远端全量中缺失的行 → 判定删除（spec 6.4）', async () => {
    const store = await createMemoryStore(); await store.init();
    await store.applyRemote([{ table: 'folder', id: 'ghost', op: 'upsert',
      data: { name: 'g' }, syncTs: '2026-09-28T10:00:00.000Z' }]);
    const fetchImpl = vi.fn(async () => ok({ records: [], cursor: '1970-01-01T00:00:00.000Z|', hasMore: false }));
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    const out = await r.pull({ full: true });
    expect(out.deletedLocally).toContain('folder::ghost');
    expect((await store.get('folder', 'ghost'))?.op).toBe('delete');
  });

  it('回环抑制：cursor 参数在响应 cursor ≤ 本地时不再触发（游标只前进）', async () => {
    const store = await createMemoryStore(); await store.init();
    await store.setCursor({ ts: '2026-09-28T12:00:00.000Z', id: 'z' });
    const fetchImpl = vi.fn(async () => ok({ records: [], cursor: '2026-09-28T11:00:00.000Z|a', hasMore: false }));
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    await r.pull();
    expect(await store.getCursor()).toEqual({ ts: '2026-09-28T12:00:00.000Z', id: 'z' });
  });

  // ---- carry-in 1：T4 空页游标（parseCursor 返回 null 的容忍与防空转）----

  it('carry-in 1a：空页游标不可解析且 hasMore=false → 不崩溃，保留原游标，只请求一次', async () => {
    const store = await createMemoryStore(); await store.init();
    await store.setCursor({ ts: '2026-09-28T12:00:00.000Z', id: 'z' });
    const fetchImpl = vi.fn(async () => ok({ records: [], cursor: '1970-01-01T00:00:00.000Z|', hasMore: false }));
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    const out = await r.pull();
    expect(out.applied).toBe(0);
    expect(await store.getCursor()).toEqual({ ts: '2026-09-28T12:00:00.000Z', id: 'z' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('carry-in 1b：hasMore=true 但游标不可解析（服务端 bug）→ 抛描述性错误而非空转', async () => {
    const store = await createMemoryStore(); await store.init();
    const fetchImpl = vi.fn(async () => ok({ records: [], cursor: '1970-01-01T00:00:00.000Z|', hasMore: true }));
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    await expect(r.pull()).rejects.toThrow(/cursor/i);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('carry-in 1c：hasMore=true 但响应游标不前进（服务端 bug）→ 抛错而非重复拉同一页', async () => {
    const store = await createMemoryStore(); await store.init();
    await store.setCursor({ ts: '2026-09-28T12:00:00.000Z', id: 'z' });
    const fetchImpl = vi.fn(async () => ok({ records: [], cursor: '2026-09-28T11:00:00.000Z|a', hasMore: true }));
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    await expect(r.pull()).rejects.toThrow(/advance|stall/i);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  // ---- carry-in 2：C4 父墓碑收养（spec 5.7 C4）----

  it('carry-in 2：pull 到父墓碑后，子行 parentId/folderId 置空迁至根（spec 5.7 C4）', async () => {
    const store = await createMemoryStore(); await store.init();
    await store.applyRemote([
      { table: 'folder', id: 'pf', op: 'upsert', data: { name: 'parent' }, syncTs: '2026-09-28T10:00:00.000Z' },
      { table: 'folder', id: 'sub', op: 'upsert', data: { name: 'child-folder', parentId: 'pf' }, syncTs: '2026-09-28T10:00:00.000Z' },
      { table: 'document', id: 'd1', op: 'upsert', data: { title: 'child-doc', folderId: 'pf' }, syncTs: '2026-09-28T10:00:00.000Z' },
      { table: 'document', id: 'd2', op: 'upsert', data: { title: 'nested-doc', parentId: 'd3' }, syncTs: '2026-09-28T10:00:00.000Z' },
      { table: 'document', id: 'd3', op: 'upsert', data: { title: 'parent-doc' }, syncTs: '2026-09-28T10:00:00.000Z' },
    ]);
    const fetchImpl = vi.fn(async () => ok({
      records: [
        { table: 'folder', id: 'pf', op: 'delete', syncTs: '2026-09-28T11:00:00.000Z' },
        { table: 'document', id: 'd3', op: 'delete', syncTs: '2026-09-28T11:00:00.000Z' },
      ],
      cursor: '2026-09-28T11:00:00.000Z|d3', hasMore: false,
    }));
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    await r.pull();
    expect((await store.get('document', 'd1'))?.data?.folderId).toBeNull();
    expect((await store.get('folder', 'sub'))?.data?.parentId).toBeNull();
    expect((await store.get('document', 'd2'))?.data?.parentId).toBeNull();
    // 未被删的父引用不受影响
    expect((await store.get('document', 'd1'))?.op).toBe('upsert');
  });

  // ---- 401 与错误状态 ----

  it('sync 401 → 抛 SyncAuthError', async () => {
    const store = await createMemoryStore(); await store.init();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }));
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    await expect(r.pull()).rejects.toBeInstanceOf(SyncAuthError);
  });

  it('其他 !ok（如 500）→ 抛带 status 的 Error', async () => {
    const store = await createMemoryStore(); await store.init();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: 'boom' }), { status: 500 }));
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    await expect(r.pull()).rejects.toThrow(/500/);
  });

  // ---- I7：lastPullAt 记账（boot 据此判断 30 天全量对账）----

  it('I7：pull 成功后写入 lastPullAt（增量与全量都写）', async () => {
    const store = await createMemoryStore(); await store.init();
    const fetchImpl = vi.fn(async () => ok(
      { records: [], cursor: '2026-09-28T10:00:00.000Z|z', hasMore: false }));
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    await r.pull();
    expect(await store.getKv('lastPullAt')).toBeTruthy();
    await store.setKv('lastPullAt', '2026-01-01T00:00:00.000Z');
    await r.pull({ full: true });
    expect(await store.getKv('lastPullAt')).not.toBe('2026-01-01T00:00:00.000Z');
  });

  it('I7：pull 失败（401/500）不写 lastPullAt（未成功对账不得当作新鲜）', async () => {
    const store = await createMemoryStore(); await store.init();
    const e500 = createReconciler(store, {
      fetchImpl: (async () => new Response('{}', { status: 500 })) as any });
    await expect(e500.pull()).rejects.toThrow();
    expect(await store.getKv('lastPullAt')).toBeNull();

    const e401 = createReconciler(store, {
      fetchImpl: (async () => new Response('{}', { status: 401 })) as any });
    await expect(e401.pull()).rejects.toBeInstanceOf(SyncAuthError);
    expect(await store.getKv('lastPullAt')).toBeNull();
  });

  // ---- G440/G441/G442：pull 时对"本地也改过、还没推上去"的那几条走三方合并 ----

  it('G440/G442：本地有未上报改动且服务端落后 ⇒ 三方合并（两侧改的不同格都保留）', async () => {
    const store = await createMemoryStore(); await store.init();
    // 祖先：本地镜像里那一份（title 与 icon 都是对齐时的值）
    await store.applyRemote([
      { table: 'document', id: 'd1', op: 'upsert', data: { title: '原标题', icon: '📄' }, syncTs: '2026-11-01T09:00:00.000Z' },
    ]);
    // 本地刚改了 title，还没推上去（syncTs 比服务端这批新 ⇒ 服务端落后）
    await store.enqueue({
      table: 'document', recordId: 'd1', op: 'upsert',
      payload: { data: { title: '本地标题', icon: '📄' }, syncTs: '2026-11-01T10:00:02.000Z' },
      createdAt: '2026-11-01T10:00:02.000Z',
    });
    // 服务端这批改了 icon
    const fetchImpl = vi.fn(async () => ok({
      records: [{ table: 'document', id: 'd1', op: 'upsert', data: { title: '原标题', icon: '⭐' }, syncTs: '2026-11-01T10:00:01.000Z' }],
      cursor: '2026-11-01T10:00:01.000Z|d1', hasMore: false,
    }));
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    await r.pull();
    const row = await store.get('document', 'd1');
    // 本地改的 title 保住、服务端改的 icon 也保住
    expect(row?.data).toMatchObject({ title: '本地标题', icon: '⭐' });
  });

  it('G440：没有未上报改动时照旧服务端为准（不无谓合并）', async () => {
    const store = await createMemoryStore(); await store.init();
    await store.applyRemote([
      { table: 'document', id: 'd1', op: 'upsert', data: { title: '原标题' }, syncTs: '2026-11-01T09:00:00.000Z' },
    ]);
    const fetchImpl = vi.fn(async () => ok({
      records: [{ table: 'document', id: 'd1', op: 'upsert', data: { title: '服务端标题' }, syncTs: '2026-11-01T10:00:01.000Z' }],
      cursor: '2026-11-01T10:00:01.000Z|d1', hasMore: false,
    }));
    const r = createReconciler(store, { fetchImpl: fetchImpl as any });
    await r.pull();
    expect((await store.get('document', 'd1'))?.data).toMatchObject({ title: '服务端标题' });
  });
});

/**
 * `gap.md` G1635——首轮全量对账（spec 6.4）的孤儿判定此前只遍历**手抄的 5 张表**
 * （document／folder／tag／favorite／task），注释给的理由是"其余表删除以墓碑形式在 30d 内
 * 到达"。那只对带 `deletedAt` 的表成立：`document_member`／`notification` 是**硬删**，
 * 带墓碑的表在设备离线超 30 天后墓碑也已被清掉——这两种情况下本地镜像会永远留着一条
 * 服务端早已不存在的行，而全量对账正是 spec 6.4 为"离线超 30 天"准备的唯一兜底。
 * 修法＝清单直接取 `SYNC_TABLES`（不再维护第二份名单），但本机未上报的行必须留着。
 */
describe('G1635：全量对账的孤儿判定覆盖全部同步表，且不吃掉未上报的改动', () => {
  const full = () => ok({ records: [], cursor: '1970-01-01T00:00:00.000Z|', hasMore: false });

  it('手抄 5 张之外的表也参与对账：硬删表 document_member 的陈旧行被判定删除', async () => {
    const store = await createMemoryStore(); await store.init();
    await store.applyRemote([
      { table: 'document_member', id: 'm-gone', op: 'upsert',
        data: { documentId: 'd1', userId: 'friend', role: 'viewer' }, syncTs: '2026-09-01T00:00:00.000Z' },
      { table: 'collection_item', id: 'ci-gone', op: 'upsert',
        data: { collectionId: 'c1', order: 0 }, syncTs: '2026-09-01T00:00:00.000Z' },
    ]);
    const r = createReconciler(store, { fetchImpl: ((async () => full()) as any) });
    const out = await r.pull({ full: true });
    expect(out.deletedLocally).toEqual(expect.arrayContaining([
      'document_member::m-gone', 'collection_item::ci-gone',
    ]));
    expect((await store.get('document_member', 'm-gone'))?.op).toBe('delete');
    expect((await store.get('collection_item', 'ci-gone'))?.op).toBe('delete');
  });

  it('本机还没推上去的行不算孤儿（离线新建/改动不能被全量对账当陈旧行清掉）', async () => {
    const store = await createMemoryStore(); await store.init();
    await store.applyRemote([
      { table: 'document_member', id: 'm-offline', op: 'upsert',
        data: { documentId: 'd1', userId: 'friend', role: 'editor' }, syncTs: '2026-09-01T00:00:00.000Z' },
    ]);
    // 离线时刚加的成员行：还在 pending，服务端此刻必然没有它
    await store.enqueue({
      table: 'document_member', recordId: 'm-offline', op: 'upsert',
      payload: { data: { documentId: 'd1', userId: 'friend', role: 'editor' }, syncTs: '2026-09-01T00:30:00.000Z' },
      createdAt: '2026-09-01T00:30:00.000Z',
    });
    const r = createReconciler(store, { fetchImpl: ((async () => full()) as any) });
    const out = await r.pull({ full: true });
    expect(out.deletedLocally).toEqual([]);
    expect((await store.get('document_member', 'm-offline'))?.op).toBe('upsert');
  });

  it('增量 pull 不做孤儿判定（只有 full 才对账，避免把"这一页没看到"当删除）', async () => {
    const store = await createMemoryStore(); await store.init();
    await store.setCursor({ ts: '2026-09-01T00:00:00.000Z', id: 'z' });
    await store.applyRemote([
      { table: 'document_member', id: 'm-keep', op: 'upsert',
        data: { documentId: 'd1', userId: 'friend', role: 'viewer' }, syncTs: '2026-09-01T00:00:00.000Z' },
    ]);
    const r = createReconciler(store, { fetchImpl: ((async () => full()) as any) });
    const out = await r.pull();
    expect(out.deletedLocally).toEqual([]);
    expect((await store.get('document_member', 'm-keep'))?.op).toBe('upsert');
  });

  it('user 设置行不进孤儿清单（服务端那一行暂时读不到 ≠ 本机设置该被整份判死）', async () => {
    const store = await createMemoryStore(); await store.init();
    await store.applyRemote([
      { table: 'user', id: 'u1', op: 'upsert',
        data: { theme: 'dark', editorFont: 'serif' }, syncTs: '2026-09-01T00:00:00.000Z' },
    ]);
    const r = createReconciler(store, { fetchImpl: ((async () => full()) as any) });
    const out = await r.pull({ full: true });
    expect(out.deletedLocally).toEqual([]);
    expect((await store.get('user', 'u1'))?.op).toBe('upsert');
  });
});
