// src/lib/sync-core/index.ts
// SyncManager 编排器：状态机 + applyLocal + boot（spec task-11 Step 3）
import { createIdbStore } from './adapter-idb';
import { createSqliteStore } from './adapter-sqlite';
import { createQueue, type Queue } from './queue';
import { createReconciler, SyncAuthError, type Reconciler } from './reconciler';
import { createBroadcaster, type Broadcaster } from './broadcast';
import type { SyncStore } from './store';
import type { SyncRecord, SyncRejection } from './types';
import type { SyncStatus } from './types';
import { storageBackend } from '@/lib/platform';
import { unknownPayloadKeys } from '@/lib/sync/tables';

export type { SyncStatus };

const DEBOUNCE = 2000;      // spec：applyLocal → flush 去抖
const FLUSH_AT = 50;        // spec：pending 达阈值立即 flush
// 退避阶梯 [2000..300000]（硬规则 5）：第 n 次失败取 BACKOFF[n-1]，封顶末位
const BACKOFF = [2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 128_000, 256_000, 300_000];
// I7：距上次成功 pull 超过该时长 → boot 全量对账（墓碑保留期 30 天，spec 6.4）
const FULL_RECONCILE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export interface ApplyLocalOpts {
  table: string;
  id: string;
  patch: Record<string, unknown> | null;   // patch === null 表示删除
}

export interface SyncManager {
  boot(): Promise<void>;                       // 幂等：pull(full 无 cursor) + 广播 + flush
  resume(): Promise<void>;                     // R-12：清 paused → pull + flush（SPA 登录后恢复）
  applyLocal(o: ApplyLocalOpts): Promise<void>; // 写本地 + 入队 + debounce flush（不等 flush）
  flushNow(): Promise<void>;                     // 清 debounce 立即 push：新建后跳转等需要服务端先可见的场景
  /**
   * G1516：把内核那座库交给读侧门面（`components/sync/local-records.ts`）。
   * ☆ 此前读侧**另开一份 store 单例**：浏览器上看不出（idb 按库名开，两个句柄指同一座库），
   *   而桌面 `createSqliteStore()` 写死 `:memory:` ⇒ 两个句柄＝两座互不相通的库（G1516 的机制本体）。
   * 这里给的是**已经过了开库闸门**的那一座（`await ensureInit()` 之后返回），
   * 于是读侧既不必自管 init，也不会绕过内核闸门。
   */
  readyStore(): Promise<SyncStore>;
  status(): SyncStatus;
  pendingCount(): Promise<number>;
  subscribe(cb: (s: SyncStatus, pending: number) => void): () => void; // 指示器订阅
  onStoreChanged(cb: (table: string) => void): () => void;            // UI 树刷新订阅
  /**
   * G1506：服务端拒绝（LWW 更旧、或铸造闸/他人行拒收）的明细。每次 push 的响应里
   * 有 `rejected` 才发一次；权威值此时已由本模块盖回本地镜像，订阅者只负责"看得见"。
   */
  onRejected(cb: (rejected: SyncRejection[]) => void): () => void;
}

// 测试缝隙（仅测试消费；生产代码只依赖 SyncManager）
export interface TestSyncManager extends SyncManager {
  triggerFlushForTest(): void;
  fireMetaForTest(): void;
}

export interface ManagerDeps {
  store?: () => SyncStore;
  makeQueue?: (store: SyncStore, onRejected: (rejected: SyncRejection[]) => void) => Queue;
  makeReconciler?: (store: SyncStore) => Reconciler;
  makeBroadcaster?: (onMeta: () => void, onLiveChange: (live: boolean) => void) => Broadcaster;
  fetchImpl?: typeof fetch;
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function createManager(deps: Partial<ManagerDeps> = {}): TestSyncManager {
  // P3 接线：按 storageBackend 选择 sqlite/idb（测试经 deps.store 注入 memory 保持隔离）
  const base = deps.store ? deps.store() : storageBackend() === 'sqlite' ? createSqliteStore() : createIdbStore();

  // 触达表集合：applyRemote 过程记录 table，pull/applyLocal 完成后广播 onStoreChanged
  let touched = new Set<string>();

  /**
   * G1514：开库（IndexedDB / sqlite）是异步的，此前整条线只有 boot() 里一句
   * `await store.init()` ⇒ 新标签页第一下「新建」早于 boot 完成时，applyLocal 抛
   * `IdbSyncStore: call init() first`：界面已按本地意图画完，写入却一个字没落地。
   * ⇒ 闸门收进下面的 store 门面：任何一次触碰之前先把库开开，与 boot 谁先到无关。
   * ☆ 是 store.init()，不是 boot()——点击路径不该为此等一趟网络往返。
   *   失败不缓存（下一次触碰重试）：缓存一个拒绝的 promise 等于把这一笔永久说成"已写好"。
   */
  let initPromise: Promise<void> | null = null;
  // G1518 的解锁条件：库**已经开好**之后走直通，不再为每一次 store 触碰白等一拍微任务。
  // ☆ `initSettled` 只在开库**成功**后置真；失败照旧清空 `initPromise` 让下一次重试（R-14）。
  let initSettled = false;
  function ensureInit(): Promise<void> {
    if (initSettled) return Promise.resolve();
    if (!initPromise) {
      initPromise = base.init().then(
        () => {
          initSettled = true;
        },
        (err: unknown) => {
          initPromise = null;
          throw err;
        },
      );
    }
    return initPromise;
  }

  function guarded<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
    // 直通那一支**不再经过 `.then`**：`await 一个已 resolve 的 promise` 本身也要多一拍微任务，
    // 这一拍正是 G1518 记的那一枚（"applyLocal 之后同步读镜像读不到"要补 `setTimeout(r,0)` 的成因）。
    return (...args: A) => (initSettled ? fn(...args) : ensureInit().then(() => fn(...args)));
  }

  const store: SyncStore = {
    ...base,
    init: ensureInit,
    applyRemote: guarded(async (records: SyncRecord[]) => {
      for (const r of records) touched.add(r.table);
      await base.applyRemote(records);
    }),
    get: guarded(base.get),
    all: guarded(base.all),
    enqueue: guarded(base.enqueue),
    peekBatch: guarded(base.peekBatch),
    ack: guarded(base.ack),
    bumpTry: guarded(base.bumpTry),
    countPending: guarded(base.countPending),
    getCursor: guarded(base.getCursor),
    setCursor: guarded(base.setCursor),
    getKv: guarded(base.getKv),
    setKv: guarded(base.setKv),
  };

  const statusSubs = new Set<(s: SyncStatus, pending: number) => void>();
  const storeSubs = new Set<(table: string) => void>();
  const rejectedSubs = new Set<(rejected: SyncRejection[]) => void>();

  // I5：初始 'syncing' 而非 'offline'——boot 前指示器显示良性的「同步中」，
  // 不误报「离线 · 0 条待传」（真实离线由 offline 事件 / navigator.onLine 判定）
  let status: SyncStatus = 'syncing';
  let paused = false;                   // auth 暂停：不重试（硬规则 6）
  let failStreak = 0;
  let cachedPending = 0;
  let inFlight: Promise<void> | null = null;  // 在途的那轮 flush（串行化用，见 flush）
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let backoffTimer: ReturnType<typeof setTimeout> | null = null;
  let bootPromise: Promise<void> | null = null;
  let listening = false;
  let broadcastStarted = false;
  const warnedCols = new Set<string>();   // G1492 白名单告警去重（每 manager 实例一次）

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

  async function flushOnce(): Promise<void> {
    // 硬规则 6：offline → status offline，不发请求
    if (isOffline()) {
      setStatus('offline');
      return;
    }
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
      // 硬规则 2（R-13 修订）：'synced' 仅当 flush ok && countPending()===0；
      // ok 但 pending>0 保持 'syncing'（'degraded' 专留给 SSE 断连，spec 9.1）
      if (cachedPending === 0) setStatus('synced');
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
    // 硬规则 5（R-13 修订）：3 次失败 → 'error'；1-2 次保持 'syncing' 带退避重试
    // （瞬时失败不再落 'degraded'——该状态专留给 SSE 断连，spec 9.1）
    setStatus(failStreak >= 3 ? 'error' : 'syncing');
    const delay = BACKOFF[Math.min(failStreak - 1, BACKOFF.length - 1)];
    await bumpPendingRetry(delay);
    scheduleBackoff(delay);
  }

  /**
   * 串行，不丢请求。旧实现是 `if (flushing) return`——并发那次直接落空，而 `flushNow`
   * 已经先 clearDebounce 把去抖定时器取消了，于是刚入队的 op 只能等下一个无关触发点才推送；
   * 紧随其后的 `load()` 读的是服务端权威行，这次写看起来就像没发生。
   * 排在后面的调用等在途那轮跑完再跑自己的一轮；队列空时 queue.flush 直接返回，不发请求。
   */
  async function flush(): Promise<void> {
    if (paused) return;
    while (inFlight) {
      try {
        await inFlight;
      } catch {
        // 上一轮的异常由那一轮自己处理（退避/状态），这里只等它结束
      }
    }
    const pass = flushOnce();
    inFlight = pass;
    try {
      await pass;
    } finally {
      if (inFlight === pass) inFlight = null;
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

  // R-13：'degraded' 仅由 SSE 断连触发（spec 9.1）
  const handleLiveChange = (live: boolean): void => {
    if (!live) {
      // 在线且非 error 才降级（offline 状态由 offline 事件管理，error 不被 SSE 掩盖）
      if (!isOffline() && status !== 'error') setStatus('degraded');
      return;
    }
    if (status === 'degraded') {
      setStatus('syncing');
      void pull();
    }
  };

  // onRejected：服务端权威版本覆盖本地（硬规则 7）。
  // G1506：覆盖只让界面"看起来变回了原样"，本人那一笔到底有没有落地，界面此前一句不说
  // （丢列＝出不了设备、派生失败＝徽标说谎、这一枚＝动作凭空蒸发，同一族失真的第三个身位）。
  // ⇒ 明细同时发给 UI 订阅者，由 `rejection-copy` 决定说什么。
  const handleRejected = (rejected: SyncRejection[]): void => {
    if (!rejected.length) return;
    for (const cb of rejectedSubs) cb(rejected);
    void store.applyRemote(rejected).then(emitTouched).catch(() => {});
  };

  const queue: Queue = deps.makeQueue
    ? deps.makeQueue(store, handleRejected)
    : createQueue(store, { fetchImpl: deps.fetchImpl, onRejected: handleRejected });
  const reconciler: Reconciler = deps.makeReconciler
    ? deps.makeReconciler(store)
    : createReconciler(store, { fetchImpl: deps.fetchImpl });
  const broadcaster: Broadcaster = deps.makeBroadcaster
    ? deps.makeBroadcaster(handleMeta, handleLiveChange)
    : createBroadcaster({ onMeta: handleMeta, onLiveChange: handleLiveChange });

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
      // I7：30 天全量对账——墓碑 30d 已清（spec 6.4），超龄的增量游标不可信，
      // boot 时改走 {full:true}（含首次全量、lastPullAt 缺失/超龄/不可解析）
      const cursor = await store.getCursor();
      const lastPullAt = await store.getKv('lastPullAt');
      const age = lastPullAt ? Date.now() - Date.parse(lastPullAt) : NaN;
      const stale = !Number.isFinite(age) || age > FULL_RECONCILE_AFTER_MS;
      await pull(!cursor || stale ? { full: true } : undefined);
      if (!broadcastStarted) {
        broadcaster.start();     // 硬规则 3：start() 一次
        broadcastStarted = true;
      }
      await flush();
      listen();
    })().catch((err) => {
      // R-14：401 → pull 内已静默转 paused，不算 boot 失败；其余必须可观测且可重试
      if (err instanceof SyncAuthError) return;
      console.error('[sync] boot failed', err);
      bootPromise = null;   // 重置幂等缓存：下一次 boot() 重新尝试
    });
    return bootPromise;
  }

  // R-12：SPA 登录（router.push，无 reload）后解除 auth 暂停并恢复同步
  async function resume(): Promise<void> {
    paused = false;
    // 与 boot 同守卫：离线只做状态迁移，不发请求（online 事件会再触发）
    if (isOffline()) {
      setStatus('offline');
      return;
    }
    await pull();
    await flush();
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
    // spec 5.5 同 (table,recordId) 只留一条；字段级合并 payload——否则「新建后紧跟改名/删除」
    // 会把 create 的全字段（含 userId，服务端建行必需）覆盖丢掉，推送时整批 500。
    let payloadData: Record<string, unknown> | undefined = o.patch ?? undefined;
    if (op === 'upsert') {
      try {
        const pendingOps = await store.peekBatch(Number.MAX_SAFE_INTEGER, '9999-12-31T23:59:59.999Z');
        const prev = pendingOps.find(p =>
          p.table === o.table && p.recordId === o.id && p.op === 'upsert');
        if (prev?.payload.data) payloadData = { ...prev.payload.data, ...o.patch };
      } catch {
        // 读 pending 失败 → 按新 patch 入队（保持旧行为）
      }
    }
    // G1492 运行时补面：静态那道闸判不出变量 patch，这里在**入队之前**把键与白名单求差。
    // ☆ 只报不改：剔掉键就等于再造一次"本地已改、服务端永远不知道"的静默丢失。
    //   一枚 `table.列` 只报一次（同一处调用点会随输入反复触发，刷屏会把真信息埋掉）。
    if (op === 'upsert' && process.env.NODE_ENV !== 'production') {
      for (const key of unknownPayloadKeys(o.table, payloadData)) {
        const seen = `${o.table}.${key}`;
        if (warnedCols.has(seen)) continue;
        warnedCols.add(seen);
        console.warn(`[sync] ${o.table}.${key} 不在 SYNC_TABLES.cols ⇒ 本地已改，却永远推不到服务端（G1492）`);
      }
    }
    await store.enqueue({
      table: o.table,
      recordId: o.id,
      op,
      payload: { data: payloadData, syncTs },
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
    resume,
    applyLocal,
    flushNow: () => {
      clearDebounce();
      return flush();
    },
    // G1516：读侧门面要的那座库——先过开库闸门，再把**同一个**句柄交出去
    readyStore: async () => {
      await ensureInit();
      return base;
    },
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
    onRejected(cb) {
      rejectedSubs.add(cb);
      return () => void rejectedSubs.delete(cb);
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
