// src/lib/sync-core/index.test.ts
// TDD Step 1：SyncManager 失败测试（先 RED，后实现）
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createManager, type TestSyncManager } from './index';
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
  lastEnqueue: () => { table: string; recordId: string; op: 'upsert' | 'delete' } | null;
}

async function makeManager(
  opts: { flushResult?: 'ok' | 'network' | 'auth' | 'http' } = {},
): Promise<Harness> {
  const base = createMemoryStore();
  await base.init();

  let last: { table: string; recordId: string; op: 'upsert' | 'delete' } | null = null;
  const store: SyncStore = {
    ...base,
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

  const manager = createManager({
    store: () => store,
    makeQueue: () => queue,
    makeReconciler: () => ({ pull: pullSpy }),
    makeBroadcaster: () => ({
      start: broadcasterStart,
      stop: vi.fn(),
      isLive: () => false,
    }),
  });

  const notify = vi.fn();
  manager.subscribe(notify);

  return { manager, queue, store, pullSpy, broadcasterStart, notify, lastEnqueue: () => last };
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
});
