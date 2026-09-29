// src/lib/sync-core/index.ts
// SyncManager 编排器：状态机 + applyLocal + boot（spec task-11 Step 3）
import { createIdbStore } from './adapter-idb';
import { createQueue, type Queue } from './queue';
import { createReconciler, SyncAuthError, type Reconciler } from './reconciler';
import { createBroadcaster, type Broadcaster } from './broadcast';
import type { SyncStore } from './store';
import type { SyncRecord } from './types';
import type { SyncStatus } from './types';
import { storageBackend } from '@/lib/platform';

export type { SyncStatus };

// P1 硬规则：store 一律 createIdbStore()，不按 storageBackend 分支（P3 接真 sqlite 时再启用）。
// 保留 import 引用（平台能力探测入口），避免 unused-import。
void storageBackend;

const DEBOUNCE = 2000;      // spec：applyLocal → flush 去抖
const FLUSH_AT = 50;        // spec：pending 达阈值立即 flush
// 退避阶梯 [2000..300000]（硬规则 5）：第 n 次失败取 BACKOFF[n-1]，封顶末位
const BACKOFF = [2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 128_000, 256_000, 300_000];

export interface ApplyLocalOpts {
  table: string;
  id: string;
  patch: Record<string, unknown> | null;   // patch === null 表示删除
}

export interface SyncManager {
  boot(): Promise<void>;                       // 幂等：pull(full 无 cursor) + 广播 + flush
  applyLocal(o: ApplyLocalOpts): Promise<void>; // 写本地 + 入队 + debounce flush（不等 flush）
  status(): SyncStatus;
  pendingCount(): Promise<number>;
  subscribe(cb: (s: SyncStatus, pending: number) => void): () => void; // 指示器订阅
  onStoreChanged(cb: (table: string) => void): () => void;            // UI 树刷新订阅
}

// 测试缝隙（仅测试消费；生产代码只依赖 SyncManager）
export interface TestSyncManager extends SyncManager {
  triggerFlushForTest(): void;
  fireMetaForTest(): void;
}

export interface ManagerDeps {
  store?: () => SyncStore;
  makeQueue?: (store: SyncStore, onRejected: (rejected: SyncRecord[]) => void) => Queue;
  makeReconciler?: (store: SyncStore) => Reconciler;
  makeBroadcaster?: (onMeta: () => void) => Broadcaster;
  fetchImpl?: typeof fetch;
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function createManager(deps: Partial<ManagerDeps> = {}): TestSyncManager {
  // 4) store 装配：P1 一律 createIdbStore()（测试经 deps.store 注入 memory）
  const base = deps.store ? deps.store() : createIdbStore();

  // 触达表集合：applyRemote 过程记录 table，pull/applyLocal 完成后广播 onStoreChanged
  let touched = new Set<string>();
  const store: SyncStore = {
    ...base,
    applyRemote: async (records) => {
      for (const r of records) touched.add(r.table);
      await base.applyRemote(records);
    },
  };

  const statusSubs = new Set<(s: SyncStatus, pending: number) => void>();
  const storeSubs = new Set<(table: string) => void>();

  let status: SyncStatus = 'offline';   // boot 前无连接
  let paused = false;                   // auth 暂停：不重试（硬规则 6）
  let failStreak = 0;
  let cachedPending = 0;
  let flushing = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let backoffTimer: ReturnType<typeof setTimeout> | null = null;
  let bootPromise: Promise<void> | null = null;
  let listening = false;
  let broadcastStarted = false;

  function notifyAll(): void {
    for (const cb of statusSubs) cb(status, cachedPending);
  }

  function setStatus(s: SyncStatus): void {
    // 硬规则 5：仅状态实际变化时通知（error 只通知一次）
    if (s === status) return;
    status = s;
    notifyAll();
  }

  function emitTouched(): void {
    if (!touched.size) return;
    const tables = [...touched];
    touched = new Set();
    for (const table of tables) {
      for (const cb of storeSubs) cb(table);
    }
  }

  function clearDebounce(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function scheduleDebounce(): void {
    clearDebounce();
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void flush();
    }, DEBOUNCE);
  }

  function scheduleBackoff(delay: number): void {
    if (backoffTimer) clearTimeout(backoffTimer);
    backoffTimer = setTimeout(() => {
      backoffTimer = null;
      void flush();
    }, delay);
  }

  // 硬规则 5：网络失败的退避经 bumpTry 落到每条 pending（peekBatch 到点才放行）
  async function bumpPendingRetry(delay: number): Promise<void> {
    try {
      const now = Date.now();
      const eligible = await store.peekBatch(Number.MAX_SAFE_INTEGER, new Date(now).toISOString());
      const nextRetryAt = new Date(now + delay).toISOString();
      for (const op of eligible) await store.bumpTry(op.seq, nextRetryAt);
    } catch {
      // store 未 init 等异常：忽略——退避定时器仍会触发重试
    }
  }

  async function flush(): Promise<void> {
    if (paused || flushing) return;
    // 硬规则 6：offline → status offline，不发请求
    if (isOffline()) {
      setStatus('offline');
      return;
    }
    flushing = true;
    try {
      cachedPending = await store.countPending();
      setStatus('syncing');
      let res: { pushed: number; status: 'ok' | 'network' | 'http' | 'auth' };
      try {
        // 硬规则 1：queue.flush 抛错计为 network
        res = await queue.flush();
      } catch {
        res = { pushed: 0, status: 'network' };
      }
      cachedPending = await store.countPending();

      if (res.status === 'ok') {
        failStreak = 0;
        // 硬规则 2：'synced' 仅当 flush ok && countPending()===0
        setStatus(cachedPending === 0 ? 'synced' : 'degraded');
        return;
      }
      if (res.status === 'auth') {
        // spec：auth → 暂停不重试，UI 订阅者收到后跳登录
        paused = true;
        setStatus('error');
        return;
      }
      if (res.status === 'http') {
        // 400/413 是程序 bug，不重试
        setStatus('error');
        return;
      }
      // network
      if (isOffline()) {
        setStatus('offline');
        return;
      }
      failStreak += 1;
      // 硬规则 5：3 次失败 → 'error'，其间 degraded；仅首转 'error' 通知
      setStatus(failStreak >= 3 ? 'error' : 'degraded');
      const delay = BACKOFF[Math.min(failStreak - 1, BACKOFF.length - 1)];
      await bumpPendingRetry(delay);
      scheduleBackoff(delay);
    } finally {
      flushing = false;
    }
  }

  async function pull(opts?: { full?: boolean }): Promise<void> {
    if (paused) return;
    try {
      await reconciler.pull(opts);
    } catch (e) {
      // 硬规则 6：SyncAuthError → paused 静默（不通知订阅者）
      if (e instanceof SyncAuthError) paused = true;
      // 其余（网络/服务端）错误静默，留待 online/meta 事件重试
    } finally {
      emitTouched();   // pull 完成按 records 的 table 集合广播
    }
  }

  const handleMeta = (): void => {
    void pull();     // 500ms 去抖已在 broadcaster 内
  };

  // onRejected：服务端权威版本覆盖本地（硬规则 7）
  const handleRejected = (rejected: SyncRecord[]): void => {
    if (!rejected.length) return;
    void store.applyRemote(rejected).then(emitTouched).catch(() => {});
  };

  const queue: Queue = deps.makeQueue
    ? deps.makeQueue(store, handleRejected)
    : createQueue(store, { fetchImpl: deps.fetchImpl, onRejected: handleRejected });
  const reconciler: Reconciler = deps.makeReconciler
    ? deps.makeReconciler(store)
    : createReconciler(store, { fetchImpl: deps.fetchImpl });
  const broadcaster: Broadcaster = deps.makeBroadcaster
    ? deps.makeBroadcaster(handleMeta)
    : createBroadcaster({ onMeta: handleMeta });

  function listen(): void {
    if (listening || typeof window === 'undefined') return;
    listening = true;
    window.addEventListener('online', () => {
      if (paused) return;
      void flush();
      void pull();
    });
    window.addEventListener('offline', () => setStatus('offline'));
    window.addEventListener('focus', () => {
      if (paused) return;
      void flush();
    });
  }

  function boot(): Promise<void> {
    // 硬规则 6：boot 幂等——重复调用返回同一 promise，broadcaster.start 只发生一次
    if (bootPromise) return bootPromise;
    bootPromise = (async () => {
      await store.init();
      const cursor = await store.getCursor();
      await pull(cursor ? undefined : { full: true });
      if (!broadcastStarted) {
        broadcaster.start();     // 硬规则 3：start() 一次
        broadcastStarted = true;
      }
      await flush();
      listen();
    })().catch(() => {
      // UI 侧 void boot()：初始化错误不向外抛（auth 已在 pull 内静默转 paused）
    });
    return bootPromise;
  }

  async function applyLocal(o: ApplyLocalOpts): Promise<void> {
    const syncTs = new Date().toISOString();
    const op: 'upsert' | 'delete' = o.patch === null ? 'delete' : 'upsert';
    // 本地立即可见：delete → 墓碑；upsert → 合并
    await store.applyRemote([
      {
        table: o.table,
        id: o.id,
        op,
        ...(o.patch !== null && o.patch !== undefined ? { data: o.patch } : {}),
        syncTs,
      },
    ]);
    await store.enqueue({
      table: o.table,
      recordId: o.id,
      op,
      payload: { data: o.patch ?? undefined, syncTs },
      createdAt: syncTs,
    });
    emitTouched();   // UI 树即时刷新（硬规则 7）

    cachedPending = await store.countPending();
    if (cachedPending >= FLUSH_AT) {
      clearDebounce();
      void flush();
    } else {
      scheduleDebounce();   // 硬规则 7：debounce 2000ms 后 flush
    }
    // 不等待 flush（returns immediately）
  }

  return {
    boot,
    applyLocal,
    status: () => status,
    pendingCount: () => queue.pendingCount(),
    subscribe(cb) {
      statusSubs.add(cb);
      cb(status, cachedPending);
      return () => void statusSubs.delete(cb);
    },
    onStoreChanged(cb) {
      storeSubs.add(cb);
      return () => void storeSubs.delete(cb);
    },
    // 测试缝隙
    triggerFlushForTest: () => void flush(),
    fireMetaForTest: () => handleMeta(),
  };
}

let singleton: SyncManager | null = null;
export function getSyncManager(): SyncManager {
  if (!singleton) singleton = createManager();
  return singleton;
}
