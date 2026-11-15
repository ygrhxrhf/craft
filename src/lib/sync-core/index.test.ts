// src/lib/sync-core/index.test.ts
// TDD Step 1：SyncManager 失败测试（先 RED，后实现）
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createManager, type TestSyncManager } from './index';
import { SyncAuthError } from './reconciler';
import { createMemoryStore, type SyncStore } from './store';
import type { SyncRejection } from './types';
import type { Queue } from './queue';

// 依赖注入点：createManager({ store, makeQueue, makeReconciler, makeBroadcaster })
// makeManager 装配 memory store + spy 的 queue/reconciler/broadcaster，
// 暴露 triggerFlushForTest / fireMetaForTest / notify（与被测实现的真实接线一致）。

interface Harness {
  manager: TestSyncManager;
  queue: Queue;
  store: SyncStore;
  pullSpy: ReturnType<typeof vi.fn>;
  broadcasterStart: ReturnType<typeof vi.fn>;
  notify: ReturnType<typeof vi.fn>;
  fireLive: (live: boolean) => void;
  lastEnqueue: () => { table: string; recordId: string; op: 'upsert' | 'delete' } | null;
}

async function makeManager(
  opts: { flushResult?: 'ok' | 'network' | 'auth'; failInitOnce?: boolean } = {},
): Promise<Harness> {
  const base = createMemoryStore();
  await base.init();

  let last: { table: string; recordId: string; op: 'upsert' | 'delete' } | null = null;
  let initFailed = false;
  const store: SyncStore = {
    ...base,
    init: async () => {
      // R-14：模拟 boot 初始化抛错（仅一次），验证 bootPromise 可重试
      if (opts.failInitOnce && !initFailed) {
        initFailed = true;
        throw new Error('init boom');
      }
      await base.init();
    },
    enqueue: async (op) => {
      last = { table: op.table, recordId: op.recordId, op: op.op };
      await base.enqueue(op);
    },
  };

  const flush = vi.fn<Queue['flush']>(async () => ({
    pushed: 0,
    status: opts.flushResult ?? 'ok',
  }));
  const queue: Queue = { flush, pendingCount: () => store.countPending() };

  const pullSpy = vi.fn(async (_opts?: { full?: boolean }) => ({
    applied: 0,
    deletedLocally: [] as string[],
  }));
  const broadcasterStart = vi.fn();
  let liveHandler: ((live: boolean) => void) | null = null;

  const manager = createManager({
    store: () => store,
    makeQueue: () => queue,
    makeReconciler: () => ({ pull: pullSpy }),
    makeBroadcaster: (_onMeta: () => void, onLiveChange?: (live: boolean) => void) => {
      liveHandler = onLiveChange ?? null;
      return { start: broadcasterStart, stop: vi.fn(), isLive: () => false };
    },
  });

  const notify = vi.fn();
  manager.subscribe(notify);

  return {
    manager,
    queue,
    store,
    pullSpy,
    broadcasterStart,
    notify,
    fireLive: (live) => liveHandler?.(live),
    lastEnqueue: () => last,
  };
}

describe('SyncManager', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('applyLocal：写本地 → 入队 → debounce 2000ms 后 flush', async () => {
    vi.useFakeTimers();
    const { manager, queue, store } = await makeManager();
    await manager.applyLocal({ table: 'document', id: 'd1', patch: { title: 'new' } });
    expect(await store.get('document', 'd1')).toMatchObject({ data: { title: 'new' } });
    expect(queue.flush).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000);
    expect(queue.flush).toHaveBeenCalledTimes(1);
  });

  it('applyLocal patch=null → 本地标墓碑 + 入 delete 队列', async () => {
    const { manager, store, lastEnqueue } = await makeManager();
    await manager.applyLocal({ table: 'document', id: 'd1', patch: null });
    expect((await store.get('document', 'd1'))?.op).toBe('delete');
    expect(lastEnqueue()?.op).toBe('delete');
  });

  it('状态机：3 次 network 失败 → error 且仅首转时通知一次；退避 2000/4000', async () => {
    vi.useFakeTimers();
    const { manager, notify } = await makeManager({ flushResult: 'network' });
    manager.triggerFlushForTest();
    // 首次失败退避 2000ms（BACKOFF[0]），第 2 次失败退避 4000ms（BACKOFF[1]），
    // 第 3 次失败 → 'error'（硬规则：3 fails → error，仅状态首转通知）
    await vi.advanceTimersByTimeAsync(2000 + 4000);
    expect(manager.status()).toBe('error');
    const errors = notify.mock.calls.filter((c) => c[0] === 'error');
    expect(errors.length).toBe(1);
  });

  it('广播 onMeta → reconciler.pull()（500ms 已在 broadcaster 内去抖）', async () => {
    const { manager, pullSpy } = await makeManager();
    manager.fireMetaForTest();
    expect(pullSpy).toHaveBeenCalled();
  });

  it('boot 幂等：pull(full 无 cursor) + broadcaster.start 一次 + flush', async () => {
    const { manager, pullSpy, broadcasterStart, queue } = await makeManager();
    await manager.boot();
    await manager.boot();
    expect(pullSpy).toHaveBeenCalledWith({ full: true });
    expect(broadcasterStart).toHaveBeenCalledTimes(1);
    expect(queue.flush).toHaveBeenCalledTimes(1);
  });

  // I5：boot 前指示器不能显示「离线 · 0 条待传」——初始状态须为 syncing（良性「同步中」）
  it('I5：初始状态 !== offline（订阅者首帧收到 syncing，指示器显示「同步中」）', async () => {
    const { manager, notify } = await makeManager();
    expect(manager.status()).not.toBe('offline');
    expect(manager.status()).toBe('syncing');
    // subscribe 的首帧回调（SyncStatusIndicator 据此渲染）也必须不是 offline
    expect(notify.mock.calls[0]![0]).not.toBe('offline');
  });

  // I7：30 天全量对账——boot 时 cursor 存在但 lastPullAt 超龄 → pull({full:true})
  it('I7：cursor 存在 + lastPullAt 超 30 天 → boot 全量对账 {full:true}；缺失同超龄', async () => {
    const stale = await makeManager();
    await stale.store.setCursor({ ts: '2026-06-01T00:00:00.000Z', id: 'x' });
    await stale.store.setKv('lastPullAt', '2026-06-01T00:00:00.000Z');   // >30d 前
    await stale.manager.boot();
    expect(stale.pullSpy).toHaveBeenCalledWith({ full: true });

    // cursor 存在但从未记录 lastPullAt（升级自旧版本）→ 视为超龄，同样全量
    const missing = await makeManager();
    await missing.store.setCursor({ ts: '2026-09-28T00:00:00.000Z', id: 'y' });
    await missing.manager.boot();
    expect(missing.pullSpy).toHaveBeenCalledWith({ full: true });
  });

  it('I7：cursor 存在 + lastPullAt 新鲜（≤30 天）→ boot 走增量 pull（不带 full）', async () => {
    const fresh = await makeManager();
    await fresh.store.setCursor({ ts: '2026-09-28T00:00:00.000Z', id: 'z' });
    await fresh.store.setKv('lastPullAt', new Date().toISOString());
    await fresh.manager.boot();
    expect(fresh.pullSpy).toHaveBeenCalledWith(undefined);
    expect(fresh.pullSpy).not.toHaveBeenCalledWith({ full: true });
  });

  // R-12：SPA 登录后 manager 不能永久 paused
  it('resume：401 pull → paused 后，resume() 清除暂停并重新 pull + flush', async () => {
    const { manager, pullSpy, queue } = await makeManager();
    pullSpy.mockImplementationOnce(async () => {
      throw new SyncAuthError();                 // 首次 pull 401
    });
    await manager.boot();
    // paused：meta 事件不再触发 pull；boot 内 flush 也因 paused 早退
    manager.fireMetaForTest();
    expect(pullSpy).toHaveBeenCalledTimes(1);
    expect(queue.flush).not.toHaveBeenCalled();

    await manager.resume();
    expect(pullSpy).toHaveBeenCalledTimes(2);             // 登录后 pull 恢复
    expect(queue.flush).toHaveBeenCalledTimes(1);         // flush 尝试执行
  });

  // R-13：'degraded' 仅保留给 SSE 断连（spec 9.1）
  it('SSE 断连（在线）→ degraded；重连 → syncing 并重新 pull', async () => {
    const { manager, pullSpy, fireLive } = await makeManager();
    fireLive(false);
    expect(manager.status()).toBe('degraded');
    fireLive(true);
    expect(manager.status()).toBe('syncing');
    expect(pullSpy).toHaveBeenCalled();
  });

  it('flush ok 但 pending>0 → 保持 syncing（不是 degraded）', async () => {
    vi.useFakeTimers();
    const { manager, store } = await makeManager();
    await store.enqueue({
      table: 'document',
      recordId: 'd1',
      op: 'upsert',
      payload: { data: { t: 1 }, syncTs: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    });
    manager.triggerFlushForTest();
    await vi.advanceTimersByTimeAsync(0);   // flush 首个 await 后才 setStatus
    expect(manager.status()).toBe('syncing');   // ok && pending>0：不落 degraded
  });

  it('network 失败 1-2 次 → 保持 syncing（degraded 仅 SSE 断连）', async () => {
    vi.useFakeTimers();
    const { manager } = await makeManager({ flushResult: 'network' });
    manager.triggerFlushForTest();
    await vi.advanceTimersByTimeAsync(2000);    // 第 1 次失败 + 退避
    expect(manager.status()).toBe('syncing');
  });

  // R-14：boot 失败必须可重试，不静默吞错
  it('boot 失败 → console.error + 重置 bootPromise，后续 boot() 可重试', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { manager, pullSpy, broadcasterStart } = await makeManager({ failInitOnce: true });
      await manager.boot();
      expect(errSpy).toHaveBeenCalledWith('[sync] boot failed', expect.any(Error));
      expect(pullSpy).not.toHaveBeenCalled();

      await manager.boot();                     // bootPromise 已重置 → 重试成功
      expect(pullSpy).toHaveBeenCalledWith({ full: true });
      expect(broadcasterStart).toHaveBeenCalledTimes(1);
    } finally {
      errSpy.mockRestore();
    }
  });
});

// 并发 flushNow 曾有一轮被 `if (flushing) return` 直接丢弃，而去抖定时器已被
// clearDebounce 取消 ⇒ 后一次写入滞留在队列里，服务端读路径看不到它。
describe('flush 串行，不丢后一次请求', () => {
  it('在途那轮跑完后补一轮，两条 op 都出队', async () => {
    const store = createMemoryStore();
    await store.init();

    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let firstCall = true;
    const pendingAtPass: number[] = [];
    const flush = vi.fn<Queue['flush']>(async () => {
      pendingAtPass.push(await store.countPending());
      if (firstCall) {
        firstCall = false;
        await gate;                       // 第一批卡在网络往返上
      }
      const ops = await store.peekBatch(1, '9999-12-31T23:59:59.999Z'); // 每轮只出一批
      await store.ack(ops.map((o) => o.seq));
      return { pushed: ops.length, status: 'ok' as const };
    });

    const manager = createManager({
      store: () => store,
      makeQueue: () => ({ flush, pendingCount: () => store.countPending() }),
      makeReconciler: () => ({ pull: vi.fn(async () => ({ applied: 0, deletedLocally: [] as string[] })) }),
      makeBroadcaster: () => ({ start: vi.fn(), stop: vi.fn(), isLive: () => false }),
    });

    await manager.applyLocal({ table: 'task', id: 't1', patch: { title: 'a' } });
    const first = manager.flushNow();
    await manager.applyLocal({ table: 'task', id: 't2', patch: { title: 'b' } });
    const second = manager.flushNow();     // 旧实现：这里直接 return，t2 留在队列里
    release();
    await Promise.all([first, second]);

    expect(flush).toHaveBeenCalledTimes(2);
    expect(pendingAtPass).toEqual([1, 1]);
    expect(await store.countPending()).toBe(0);
  });
});

/**
 * `gap.md` G1492 —— 静态那道白名单闸（`src/lib/sync/tables.test.ts`）只判得出写得出键名的字面量，
 * 而本仓 `applyLocal` 有一半调用点把 `patch` 交给变量。这一枚是运行时补面：入队之前把 payload 的键
 * 与所属表 `cols` 求差，多出来的当场说出口——**只报不改**（悄悄剔键就等于再造一次
 * "界面照样乐观上色、服务端永远不知道"的静默丢失，那正是 G03/G1487 那一族失真的机制本体）。
 */
describe('applyLocal 的白名单运行时告警（G1492）', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  /** 取最后一条 pending 的 payload（告警判的是**合并之后**的那份，不是新 patch）。 */
  async function queuedPayload(store: SyncStore) {
    const ops = await store.peekBatch(Number.MAX_SAFE_INTEGER, '9999-12-31T23:59:59.999Z');
    return ops[ops.length - 1]!.payload.data as Record<string, unknown>;
  }

  it('白名单外的键：当场告警，且**不**把那一枚键从 payload 里剔掉', async () => {
    const { manager, store } = await makeManager();
    await manager.applyLocal({ table: 'task', id: 't1', patch: { title: 'ok', notAColumn: 1 } });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('task.notAColumn');
    expect(await queuedPayload(store)).toMatchObject({ title: 'ok', notAColumn: 1 });
  });

  it('同一枚非法键第二次不再重复报（去重＝让真信息不被刷屏埋掉）', async () => {
    const { manager } = await makeManager();
    await manager.applyLocal({ table: 'task', id: 't1', patch: { notAColumn: 1 } });
    await manager.applyLocal({ table: 'task', id: 't2', patch: { notAColumn: 2 } });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('全部键都在 cols 里：闭嘴（这道闸不是每次都喊）', async () => {
    const { manager } = await makeManager();
    await manager.applyLocal({ table: 'task', id: 't1', patch: { title: 'a', dueDate: null } });
    expect(warn).not.toHaveBeenCalled();
  });

  it('☆ G1491 那两列现在算合法：document_share 的档位改完推得出去了', async () => {
    const { manager } = await makeManager();
    await manager.applyLocal({
      table: 'document_share',
      id: 's1',
      patch: { permission: 'edit', shareVersion: 3 },
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('删除那一档（patch=null）不告警：墓碑没有键可查', async () => {
    const { manager } = await makeManager();
    await manager.applyLocal({ table: 'task', id: 't1', patch: null });
    expect(warn).not.toHaveBeenCalled();
  });

  it('没注册的表不告警：这里不发明规则，交给调用方自己那一道', async () => {
    const { manager } = await makeManager();
    await manager.applyLocal({ table: 'not_a_table', id: 'x', patch: { whatever: 1 } });
    expect(warn).not.toHaveBeenCalled();
  });

  it('production 下一字不提（诊断面不许跟着打进产线包）', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const { manager } = await makeManager();
      await manager.applyLocal({ table: 'task', id: 't1', patch: { notAColumn: 1 } });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('☆ 判的是**合并后**那份 payload：前一次留下的非法键这一趟照样照出来', async () => {
    const { manager, store } = await makeManager();
    // 同 (table, recordId) 只留最后一条 op，字段级合并——所以合并结果才是真正要推出去的东西。
    await manager.applyLocal({ table: 'task', id: 't1', patch: { title: '第一趟合法' } });
    expect(warn).not.toHaveBeenCalled();
    await manager.applyLocal({ table: 'task', id: 't1', patch: { alsoNotAColumn: 2 } });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('task.alsoNotAColumn');
    expect(await queuedPayload(store)).toMatchObject({ title: '第一趟合法', alsoNotAColumn: 2 });
  });
});

/**
 * G1506——服务端那句「这笔我不落」此前只用来盖权威值，界面一句不说：
 * 用户看到的就是"点了恢复，什么都没发生，行还活着"，而屏上此前已闪过一次"已恢复"。
 * 这一组钉的是**通路**：明细必须原样到达 UI 订阅者，权威值覆盖不能因为加了订阅者就断。
 */
describe('服务端拒绝的明细冒到 UI（G1506）', () => {
  interface RejectHarness {
    manager: TestSyncManager;
    store: SyncStore;
    fireRejected: (rejected: SyncRejection[]) => void;
  }

  async function makeRejectingManager(): Promise<RejectHarness> {
    const base = createMemoryStore();
    await base.init();
    const store: SyncStore = { ...base };

    let onRejected: ((rejected: SyncRejection[]) => void) | null = null;
    const manager = createManager({
      store: () => store,
      makeQueue: (_s, cb) => {
        onRejected = cb;
        return {
          flush: async () => ({ pushed: 0, status: 'ok' as const }),
          pendingCount: () => store.countPending(),
        };
      },
      makeReconciler: () => ({ pull: async () => ({ applied: 0, deletedLocally: [] as string[] }) }),
      makeBroadcaster: () => ({ start: () => {}, stop: () => {}, isLive: () => false }),
    });

    return {
      manager,
      store,
      fireRejected: (rejected) => {
        // queue.flush 收到响应体时是这么喊的：opts.onRejected(body.rejected ?? [])
        onRejected?.(rejected);
      },
    };
  }

  it('onRejected 订阅者收到整批明细（含 reason），且权威值照样盖回本地', async () => {
    const { manager, store, fireRejected } = await makeRejectingManager();
    const seen = vi.fn();
    manager.onRejected(seen);

    fireRejected([{
      table: 'document', id: 'gone', op: 'delete', syncTs: '2026-09-28T12:00:00.000Z',
      reason: 'not_found',
    }]);

    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0]![0][0]).toMatchObject({ id: 'gone', reason: 'not_found' });
    // 盖权威值＝本地那行重新变回墓碑（旧代码也是这个行为，加订阅者不许把它弄断）
    // G1514：门面每次触碰先等开库 ⇒ 这一盖落在随后的微任务里，与下面 onStoreChanged 那枚同规格
    await new Promise(r => setTimeout(r, 0));
    const local = await store.get('document', 'gone');
    expect(local?.op).toBe('delete');
  });

  it('空明细不发（每一轮 ack 都会带一个 rejected 数组，不能每轮都喊）', async () => {
    const { manager, fireRejected } = await makeRejectingManager();
    const seen = vi.fn();
    manager.onRejected(seen);
    fireRejected([]);
    expect(seen).not.toHaveBeenCalled();
  });

  it('退订之后不再收（订阅者生命周期与组件一致）', async () => {
    const { manager, fireRejected } = await makeRejectingManager();
    const seen = vi.fn();
    const off = manager.onRejected(seen);
    off();
    fireRejected([{ table: 'document', id: 'a', op: 'upsert',
      data: { title: 'x' }, syncTs: '2026-09-28T12:00:00.000Z', reason: 'stale' }]);
    expect(seen).not.toHaveBeenCalled();
  });

  it('拒的那一笔同时触发 onStoreChanged（列表/回收站据此重取，陈旧行才会从屏上掉下去）', async () => {
    const { manager, fireRejected } = await makeRejectingManager();
    const tables: string[] = [];
    manager.onStoreChanged(t => tables.push(t));
    fireRejected([{ table: 'document', id: 'gone', op: 'delete',
      syncTs: '2026-09-28T12:00:00.000Z', reason: 'not_found' }]);
    await new Promise(r => setTimeout(r, 0));   // applyRemote 后微任务里 emitTouched
    expect(tables).toContain('document');
  });
});

/**
 * G1514——开库（IndexedDB / sqlite）是异步的，而**点击不等它**：此前整条线只有 boot() 里
 * 一句 `await store.init()`，于是新标签页第一下「新建」早于 boot 完成时，applyLocal 直接抛
 * `IdbSyncStore: call init() first` ⇒ 界面已按本地意图画完，写入却一个字没落地。
 * 五处调用点各自拿 `await manager.boot()` 当就绪闸门，代价是把一趟网络塞进点击路径。
 * 这一组钉闸门在**内核门面**里：任何一次触碰之前先把库开开，与 boot 谁先到无关。
 */
describe('未 boot 就写：开库闸门在内核门面里（G1514）', () => {
  interface LazyHarness {
    manager: TestSyncManager;
    base: SyncStore;              // 真实数据面：跨过闸门直接读它，证明写确实落了
    initCalls: () => number;
    failNextInit: () => void;
  }

  function makeLazyManager(): LazyHarness {
    const base = createMemoryStore();
    let opened = false;
    let initCalls = 0;
    let failNext = false;

    // 模仿两个真实适配器共同的形状：未 init 时**每次触碰同步抛错**（async 里 ⇒ 拒绝的 promise）
    const guard = () => {
      if (!opened) throw new Error('Store: call init() first');
    };
    const store: SyncStore = {
      ...base,
      init: async () => {
        initCalls++;
        if (failNext) {
          failNext = false;
          throw new Error('openDB boom');
        }
        await base.init();
        opened = true;
      },
      applyRemote: async (records) => { guard(); await base.applyRemote(records); },
      get: async (table, id) => { guard(); return base.get(table, id); },
      all: async (table) => { guard(); return base.all(table); },
      enqueue: async (op) => { guard(); await base.enqueue(op); },
      peekBatch: async (limit, nowIso) => { guard(); return base.peekBatch(limit, nowIso); },
      ack: async (seqList) => { guard(); await base.ack(seqList); },
      bumpTry: async (seq, nextRetryAt) => { guard(); await base.bumpTry(seq, nextRetryAt); },
      countPending: async () => { guard(); return base.countPending(); },
      getCursor: async () => { guard(); return base.getCursor(); },
      setCursor: async (c) => { guard(); await base.setCursor(c); },
      getKv: async (key) => { guard(); return base.getKv(key); },
      setKv: async (key, value) => { guard(); await base.setKv(key, value); },
    };

    const manager = createManager({
      store: () => store,
      makeQueue: () => ({
        flush: async () => ({ pushed: 0, status: 'ok' as const }),
        pendingCount: () => store.countPending(),
      }),
      makeReconciler: () => ({ pull: async () => ({ applied: 0, deletedLocally: [] as string[] }) }),
      makeBroadcaster: () => ({ start: () => {}, stop: () => {}, isLive: () => false }),
    });

    return { manager, base, initCalls: () => initCalls, failNextInit: () => { failNext = true; } };
  }

  it('第一下 applyLocal 早于 boot：不抛，镜像有行、队列有 op', async () => {
    const { manager, base, initCalls } = makeLazyManager();
    await manager.applyLocal({ table: 'document', id: 'd1', patch: { title: '新建' } });

    expect(initCalls()).toBe(1);
    expect((await base.get('document', 'd1'))?.data?.title).toBe('新建');
    expect(await base.countPending()).toBe(1);
  });

  it('并发 boot + 两下写入：只开一次库，三笔触碰都落', async () => {
    vi.useFakeTimers();
    const { manager, base, initCalls } = makeLazyManager();
    await Promise.all([
      manager.boot(),
      manager.applyLocal({ table: 'document', id: 'a', patch: { title: 'A' } }),
      manager.applyLocal({ table: 'document', id: 'b', patch: { title: 'B' } }),
    ]);

    expect(initCalls()).toBe(1);
    expect(await base.countPending()).toBe(2);
    expect((await base.get('document', 'a'))?.data?.title).toBe('A');
    expect((await base.get('document', 'b'))?.data?.title).toBe('B');
  });

  it('开库失败不缓存：当场照实抛出，下一次触碰重试并落写', async () => {
    const { manager, base, initCalls, failNextInit } = makeLazyManager();
    failNextInit();
    await expect(
      manager.applyLocal({ table: 'document', id: 'x', patch: { title: 'X' } })
    ).rejects.toThrow('openDB boom');

    // ☆ 闸门不能顺手把失败缓存成"永远开着"：那一笔会静默蒸发，正是本批要修的失真
    await manager.applyLocal({ table: 'document', id: 'y', patch: { title: 'Y' } });
    expect(initCalls()).toBe(2);
    expect((await base.get('document', 'y'))?.data?.title).toBe('Y');
  });

  /**
   * 闸门搬进内核之后，调用点自己那五处 `await manager.boot()` 就绪闸门必须一起退场——
   * 留着就是"两处各修一半"：点击路径照旧等一趟 pull + flush，而它想买的东西内核已经白送了。
   * 真正的 boot 只剩 SyncBoot 一发（`void getSyncManager().boot()`），不在这一列。
   */
  it.each([
    'src/app/(app)/tasks/TasksView.tsx',
    'src/app/(app)/calendar/page.tsx',
    'src/components/document/InboxList.tsx',
    'src/components/editor/tabs/InfoTab.tsx',
    'src/lib/favorite/toggle-local.ts',
  ])('%s 不再自己拿 boot() 当写路径的就绪闸门', (rel) => {
    const src = readFileSync(join(process.cwd(), rel), 'utf8');
    expect(src).not.toContain('await manager.boot()');
  });
});
