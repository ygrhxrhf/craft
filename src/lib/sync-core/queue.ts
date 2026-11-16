import type { SyncStore } from './store';
import type { PendingOp, SyncRejection } from './types';

export interface Queue {
  /**
   * `status` 只剩三种（G1630 起 `http` 那档没了）：记录级 4xx 已在队列内部逐笔隔离，
   * 要么落库、要么按 `invalid` 丢弃；只有网络/认证失败才整轮留给上层退避或暂停。
   */
  flush(): Promise<{ pushed: number; status: 'ok' | 'network' | 'auth' }>;
  pendingCount(): Promise<number>;
  /**
   * G1645：这一记录是否有 op **正在请求中**。`applyLocal` 据此等上一笔落定再生成
   * 新一笔的 `syncTs`——否则"新建后立刻改名"里，改名会在创建响应之前拿到时间戳，
   * 而服务端把创建抬到更晚（`max(serverNow, clientTs)`）⇒ 改名被判 `stale` 丢掉。
   */
  isInFlight?(table: string, recordId: string): boolean;
}

const BATCH = 200;               // spec 常量表
const TABLE_ORDER: Record<string, number> = { folder: 0 };  // 其余默认 1

type SendOutcome =
  | { status: 'ok'; body: any }
  | { status: 'auth' | 'network' | 'record' };

/**
 * `gap.md` G1630 —— 400/413 的处置规则此前是「不重试」，但那只是**不发**，队列里那批 op 仍在，
 * 下一次 flush（任何一次新改动都会触发）还是同一批、还是同一个 4xx ⇒ 队列在队头永久毒死：
 * 之后所有改动都排在同一批后面一起推不上去，状态停在 error，除了「重置文档缓存」（连未同步的
 * 改动一起丢）没有任何恢复路径。
 *
 * 服务端这两枚状态码都是**记录级**故障：413＝请求体超 2MB（单笔太大，或 200 笔合计太大），
 * 400＝`bad records`／`unknown table`／`user id mismatch`／document_tag 缺复合键（整批里有一笔
 * 不合协议）。所以修法不是"整批不重试"，而是**把坏的那一笔隔离出来**：
 *   - 413 且整批多笔 ⇒ 对半拆开重发（很可能只是合计超限，拆开就过）；
 *   - 只剩一笔仍 4xx ⇒ 这一笔永远不可能成功 ⇒ 丢掉它并按 `reason:'invalid'` 冒给 UI；
 *   - 4xx 的响应体不是本服务那几种 JSON（例如中间层代理返回 HTML）⇒ 不是记录级故障，
 *     退回 `network` 走退避重试——宁可等，也不许因为一个坏代理把用户所有未同步改动逐笔丢掉。
 */
/**
 * 服务端**记录级**错误句（`POST /api/v1/sync` 的 400/413 响应体里的 `error`）。只有这几种
 * 才能判"这一笔永远不可能成功"；其余 4xx（代理、网关、别人家的 400）必须退回 network 重试。
 * `queue-record-level.test.ts` 现读 `route.ts` 的 POST 函数体逐句核对——服务端改一句错话而
 * 这里没跟，那条闸先红（否则记录级隔离会静默退化成"无限重试"）。
 */
const RECORD_LEVEL_ERRORS = ['payload too large', 'bad records', 'user id mismatch'] as const;

export function isRecordLevelSyncError(error: string): boolean {
  return (RECORD_LEVEL_ERRORS as readonly string[]).includes(error)
    || /^unknown table \S+$/.test(error);
}

function isRecordLevelBody(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as { error?: unknown };
    return typeof parsed.error === 'string' && isRecordLevelSyncError(parsed.error);
  } catch {
    return false;
  }
}

export function createQueue(
  store: SyncStore,
  opts: { fetchImpl?: typeof fetch; onRejected?: (rejected: SyncRejection[]) => void } = {},
): Queue {
  const fetchImpl = opts.fetchImpl ?? fetch;
  /** G1645：正在 `send` 里的记录（`table::recordId`）。只活在内存里，窗口就是一次往返。 */
  const inFlight = new Set<string>();
  const keyOf = (table: string, recordId: string) => `${table}::${recordId}`;

  async function send(ops: PendingOp[]): Promise<SendOutcome> {
    const records = ops.map(op => ({
      table: op.table, id: op.recordId, op: op.op,
      ...(op.payload.data ? { data: op.payload.data } : {}),
      syncTs: op.payload.syncTs,
    }));
    let res: Response;
    try {
      res = await fetchImpl('/api/v1/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ records }),
      });
    } catch {
      return { status: 'network' };
    }
    if (res.status === 401) return { status: 'auth' };
    if (res.status === 400 || res.status === 413) {
      const raw = await res.text().catch(() => '');
      return isRecordLevelBody(raw) ? { status: 'record' } : { status: 'network' };
    }
    if (!res.ok) return { status: 'network' };
    return { status: 'ok', body: await res.json() };
  }

  /**
   * 发一批（保持调用方给的顺序），把记录级 4xx 逐笔隔离。返回 'ok' 表示这一批要么全落、
   * 要么坏的那几笔已被丢弃并冒给 UI；'network'/'auth' 表示没跑完、上层照旧退避或暂停。
   */
  async function flushRange(ops: PendingOp[]): Promise<{ status: 'ok' | 'network' | 'auth'; pushed: number }> {
    const keys = ops.map((op) => keyOf(op.table, op.recordId));
    for (const key of keys) inFlight.add(key);
    let outcome: SendOutcome;
    try {
      outcome = await send(ops);
    } finally {
      for (const key of keys) inFlight.delete(key);
    }
    if (outcome.status === 'ok') {
      await store.ack(ops.map(op => op.seq));
      // rejected 交由上层：manager 先按权威值覆盖本地，再把明细冒给 UI 订阅者（G1506）
      if (opts.onRejected && outcome.body?.rejected?.length) opts.onRejected(outcome.body.rejected);
      return { status: 'ok', pushed: ops.length };
    }
    if (outcome.status !== 'record') return { status: outcome.status, pushed: 0 };

    if (ops.length === 1) {
      // 单笔仍 4xx：这一笔永远不可能成功 ⇒ 丢掉它，别让整个队列陪葬
      const op = ops[0]!;
      await store.ack([op.seq]);
      if (opts.onRejected) {
        opts.onRejected([{
          table: op.table, id: op.recordId, op: op.op,
          syncTs: op.payload.syncTs, reason: 'invalid',
        }]);
      }
      return { status: 'ok', pushed: 1 };
    }
    // 先左后右：拆开仍然保持调用方给的顺序（folder 优先、其余 createdAt 升序）
    const mid = Math.ceil(ops.length / 2);
    const left = await flushRange(ops.slice(0, mid));
    if (left.status !== 'ok') return left;
    const right = await flushRange(ops.slice(mid));
    if (right.status !== 'ok') return { status: right.status, pushed: left.pushed + right.pushed };
    return { status: 'ok', pushed: left.pushed + right.pushed };
  }

  return {
    pendingCount: () => store.countPending(),
    isInFlight: (table, recordId) => inFlight.has(keyOf(table, recordId)),

    async flush() {
      let pushed = 0;
      for (;;) {
        const batch = await store.peekBatch(BATCH, new Date().toISOString());
        if (!batch.length) return { pushed, status: 'ok' };
        // folder 优先，其余保持 createdAt 升序（peekBatch 已按 createdAt asc，排序稳定）
        batch.sort((a, b) =>
          (TABLE_ORDER[a.table] ?? 1) - (TABLE_ORDER[b.table] ?? 1) ||
          a.createdAt.localeCompare(b.createdAt));

        const round = await flushRange(batch);
        pushed += round.pushed;
        if (round.status !== 'ok') return { pushed, status: round.status };
        // 继续下一批（hasMore 语义由 store 里还有没有 pending 决定）
      }
    },
  };
}
