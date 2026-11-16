import 'fake-indexeddb/auto';   // 文件头，为 idb 提供全局
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryStore } from './store';
import type { SyncStore } from './store';
import { createIdbStore, SYNC_DB_NAME } from './adapter-idb';
import { createSqliteStore } from './adapter-sqlite';
import { createManager } from './index';

// idb 跨用例持久，删库隔离；memory 实例天然隔离（deleteDatabase 为无害空操作）
function deleteIdb(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(SYNC_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

const rec = (id: string, ts: string, title = 'a') => ({
  table: 'document', id, op: 'upsert' as const,
  data: { title }, syncTs: ts,
});

// G1517：第三列的**名目必须等于实际**。本机没有 `better-sqlite3`（全仓 deps 里 0 命中）⇒
// `createSqliteStore()` 的 `open()` 走 catch 支、跑的是内存回退；若列名照旧写 "sqlite"，
// 这一列给出的绿就是别的东西的绿。这里在模块加载时问一次"实际跑的是哪一支"，把它写进列名。
const sqliteProbe = createSqliteStore();
await sqliteProbe.init();
const SQLITE_KIND = sqliteProbe.backendKind();

describe.each([
  ['memory', createMemoryStore],
  ['idb', createIdbStore],
  [`sqlite（本机实际：${SQLITE_KIND}）`, createSqliteStore],
])('SyncStore 契约（%s，MemoryStore 与 adapter-idb/sqlite 共用同一套用例）', (_label, factory) => {
  let s: SyncStore;
  beforeEach(async () => {
    await deleteIdb();
    s = factory();
    await s.init();
  });

  it('applyRemote upsert 合并、delete 标墓碑', async () => {
    await s.applyRemote([rec('d1', '2026-09-28T10:00:00.000Z', 'v1')]);
    await s.applyRemote([rec('d1', '2026-09-28T10:00:01.000Z', 'v2')]);
    expect((await s.get('document', 'd1'))?.data?.title).toBe('v2');
    await s.applyRemote([{ table: 'document', id: 'd1', op: 'delete', syncTs: '2026-09-28T10:00:02.000Z' }]);
    const row = await s.get('document', 'd1');
    expect(row?.op).toBe('delete');
  });

  it('同 record 连续入队合并为最后一条', async () => {
    const base = { table: 'document', recordId: 'd1', op: 'upsert' as const };
    await s.enqueue({ ...base, payload: { data: { title: 'a' }, syncTs: '2026-09-28T10:00:00.000Z' }, createdAt: '2026-09-28T10:00:00.000Z' });
    await s.enqueue({ ...base, payload: { data: { title: 'b' }, syncTs: '2026-09-28T10:00:01.000Z' }, createdAt: '2026-09-28T10:00:01.000Z' });
    expect(await s.countPending()).toBe(1);
    const [op] = await s.peekBatch(10, '2026-09-28T10:00:02.000Z');
    expect(op.payload.data?.title).toBe('b');
  });

  it('peekBatch 尊重 nextRetryAt；ack 清除；cursor 读写', async () => {
    await s.enqueue({ table: 'folder', recordId: 'f1', op: 'upsert', payload: { syncTs: '2026-09-28T10:00:00.000Z' }, createdAt: '2026-09-28T10:00:00.000Z' });
    const [op] = await s.peekBatch(10, '2026-09-28T10:00:00.000Z');
    await s.bumpTry(op.seq, '2026-09-28T10:05:00.000Z');
    expect(await s.peekBatch(10, '2026-09-28T10:01:00.000Z')).toHaveLength(0);
    expect(await s.peekBatch(10, '2026-09-28T10:06:00.000Z')).toHaveLength(1);
    await s.ack([op.seq]);
    expect(await s.countPending()).toBe(0);

    await s.setCursor({ ts: '2026-09-28T10:00:00.000Z', id: 'x' });
    expect(await s.getCursor()).toEqual({ ts: '2026-09-28T10:00:00.000Z', id: 'x' });
  });

  // I7：lastPullAt 等 sync_state 走通用 kv（两适配器同一契约）
  it('kv 读写：setKv/getKv 往返；缺失键返回 null；与 cursor 互不干扰', async () => {
    expect(await s.getKv('lastPullAt')).toBeNull();
    await s.setKv('lastPullAt', '2026-09-28T10:00:00.000Z');
    expect(await s.getKv('lastPullAt')).toBe('2026-09-28T10:00:00.000Z');
    // 与 cursor 键共存（idb 同一 KV store，键空间不冲突）
    await s.setCursor({ ts: '2026-09-28T10:00:00.000Z', id: 'x' });
    expect(await s.getKv('lastPullAt')).toBe('2026-09-28T10:00:00.000Z');
    expect(await s.getCursor()).toEqual({ ts: '2026-09-28T10:00:00.000Z', id: 'x' });
    // 覆盖写
    await s.setKv('lastPullAt', '2026-09-29T00:00:00.000Z');
    expect(await s.getKv('lastPullAt')).toBe('2026-09-29T00:00:00.000Z');
  });

  /**
   * G1642：退避时刻**存在本地库**里，整页重载后仍然有效。`nextRetryDelayMs` 是调度器唯一能问到
   * "还要等多久"的口子——三支适配器必须给出同一答案，否则刷新后的续调度只在浏览器成立、
   * 桌面（sqlite）停摆。
   */
  it('nextRetryDelayMs：没有 pending ⇒ 0；有未设退避的 ⇒ 0；全部退避中 ⇒ 最早那条的等待', async () => {
    expect(await s.nextRetryDelayMs(Date.parse('2026-09-28T10:00:00.000Z'))).toBe(0);

    const enqueueAt = (id: string) => s.enqueue({
      table: 'document', recordId: id, op: 'upsert',
      payload: { syncTs: '2026-09-28T10:00:00.000Z' }, createdAt: '2026-09-28T10:00:00.000Z',
    });
    await enqueueAt('d1');
    // 有一条没设退避 ⇒ 现在就该能推
    expect(await s.nextRetryDelayMs(Date.parse('2026-09-28T10:00:00.000Z'))).toBe(0);

    const [op1] = await s.peekBatch(10, '2026-09-28T10:00:00.000Z');
    await s.bumpTry(op1.seq, '2026-09-28T10:00:30.000Z');
    await enqueueAt('d2');
    const [op2] = await s.peekBatch(10, '2026-09-28T10:00:00.000Z');
    expect(op2.recordId).toBe('d2');
    await s.bumpTry(op2.seq, '2026-09-28T10:00:10.000Z');

    // 两笔都在退避中 ⇒ 取最早的那条（d2 的 10s），不是先入队那条
    expect(await s.nextRetryDelayMs(Date.parse('2026-09-28T10:00:00.000Z'))).toBe(10_000);
    // 已过期的退避按 0 算（不能返回负数）
    expect(await s.nextRetryDelayMs(Date.parse('2026-09-28T10:01:00.000Z'))).toBe(0);
  });
});

/**
 * G1517 —— 第三列的名目必须等于实际跑的那一支。
 *
 * ☆ 判据是**自洽式**的：期望值由 `package.json` 的依赖图**现推**（有 `better-sqlite3` 就该跑真句柄、
 *   没有就该跑内存回退），再与适配器**实际报出来的**那一支对比。
 *   ⇒ 谁把 `better-sqlite3` 写进依赖却没装上（或反过来装上却忘了删）都会红；
 *   也正因如此，"契约三跑"这句自述从此不许再把这一列默默算成一次 sqlite。
 */
describe('sqlite 列的成色（G1517）', () => {
  const pkg = JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
  ) as Record<string, Record<string, string>>;
  const declared = ['dependencies', 'devDependencies', 'optionalDependencies'].some(
    (k) => typeof pkg[k] === 'object' && pkg[k] !== null && 'better-sqlite3' in pkg[k],
  );

  it('列里跑的那一支 == 依赖图推出来的那一支', () => {
    expect(['better-sqlite3', 'memory-fallback']).toContain(SQLITE_KIND);
    expect(
      SQLITE_KIND,
      declared
        ? 'package.json 声明了 better-sqlite3 ⇒ 这一列应当跑真句柄'
        : 'package.json 没有 better-sqlite3 ⇒ 这一列跑的是内存回退，列名不许写成「sqlite」',
    ).toBe(declared ? 'better-sqlite3' : 'memory-fallback');
  });

  it('名目与实际一致已经写进列名本身（人读报告时不会把回退读成 sqlite）', () => {
    expect(`sqlite（本机实际：${SQLITE_KIND}）`).toContain(SQLITE_KIND);
  });
});

/**
 * G1514 的适配器半边：开库按**在途那一次**去重。旧写法是 `if (db) return` 之后才
 * `db = await openDB(…)`／`new Database(…)` ⇒ 同一实例上并发两发 init() 各开一个句柄。
 * idb 那一枚多出来的句柄没人再引用，却会把日后删库（登出清理）永久堵住；
 * sqlite 的 `:memory:` 更硬——后落地那次赋值把先写的整座库丢掉。
 * memory 不在列：它的 init 是空操作，没有句柄可漏。
 */
describe('并发 init 共用同一次开库（G1514）', () => {
  it.each([
    ['idb', () => createIdbStore()],
    ['sqlite', () => createSqliteStore()],
  ])('%s：未 await 的两发 init() 返回同一个 promise', async (_label, factory) => {
    const s = factory();
    const first = s.init();
    expect(s.init()).toBe(first);
    await first;
    // 开完库照常用：闸门不能把写入挡在门外
    await s.applyRemote([rec('d1', '2026-09-28T10:00:00.000Z')]);
    expect((await s.get('document', 'd1'))?.data?.title).toBe('a');
  });
});

/**
 * G1514 的另一半，也是这一枚洞的真实形状：**真适配器 + 真内核**，不 boot 直接点「新建」。
 * 上面那组用的是手写会抛错的假 store；这一组跑的是 `createIdbStore()` 本体 ⇒ 摘掉内核
 * 门面里的闸门，红出来的是产品里那句原文 `IdbSyncStore: call init() first`。
 */
describe('真 idb 适配器 + 真内核：未 boot 的第一笔写入落进库（G1514）', () => {
  it('applyLocal 不 boot 也不抛，镜像与 pending 都读得到', async () => {
    await deleteIdb();
    const manager = createManager({
      store: () => createIdbStore(),
      makeQueue: () => ({
        flush: async () => ({ pushed: 0, status: 'ok' as const }),
        pendingCount: async () => 0,
      }),
      makeReconciler: () => ({ pull: async () => ({ applied: 0, deletedLocally: [] as string[] }) }),
      makeBroadcaster: () => ({ start: () => {}, stop: () => {}, isLive: () => false }),
    });

    await manager.applyLocal({ table: 'document', id: 'd-new', patch: { title: '甲' } });

    // 另开一个实例读同一座库：证明真写进了 IndexedDB，而不是只更新了内存里的镜像
    const reader = createIdbStore();
    await reader.init();
    expect((await reader.get('document', 'd-new'))?.data?.title).toBe('甲');
    expect(await reader.countPending()).toBe(1);
  });
});
