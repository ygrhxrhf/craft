// src/lib/sync-core/index.test.ts
// TDD Step 1：SyncManager 失败测试（先 RED，后实现）
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createManager, type TestSyncManager } from './index';
import { SyncAuthError } from './reconciler';
import { createMemoryStore, type SyncStore } from './store';
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
  opts: { flushResult?: 'ok' | 'network' | 'auth' | 'http'; failInitOnce?: boolean } = {},
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
