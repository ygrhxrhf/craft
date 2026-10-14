import type { SyncStore } from './store';
import type { SyncRejection } from './types';

export interface Queue {
  flush(): Promise<{ pushed: number; status: 'ok' | 'network' | 'http' | 'auth' }>;
  pendingCount(): Promise<number>;
}

const BATCH = 200;               // spec 常量表
const TABLE_ORDER: Record<string, number> = { folder: 0 };  // 其余默认 1

export function createQueue(
  store: SyncStore,
  opts: { fetchImpl?: typeof fetch; onRejected?: (rejected: SyncRejection[]) => void } = {},
): Queue {
  const fetchImpl = opts.fetchImpl ?? fetch;

  return {
    pendingCount: () => store.countPending(),

    async flush() {
      let pushed = 0;
      for (;;) {
        const batch = await store.peekBatch(BATCH, new Date().toISOString());
        if (!batch.length) return { pushed, status: 'ok' };
        // folder 优先，其余保持 createdAt 升序（peekBatch 已按 createdAt asc，排序稳定）
        batch.sort((a, b) =>
          (TABLE_ORDER[a.table] ?? 1) - (TABLE_ORDER[b.table] ?? 1) ||
          a.createdAt.localeCompare(b.createdAt));

        const records = batch.map(op => ({
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
          return { pushed, status: 'network' };
        }
        if (res.status === 401) return { pushed, status: 'auth' };
        // I6/spec 9.2：只有 400/413（程序 bug）不重试；5xx 与其余失败归 network，
        // 上层 manager 按退避阶梯重试（连续 3 次 → error）
        if (res.status === 400 || res.status === 413) return { pushed, status: 'http' };
        if (!res.ok) return { pushed, status: 'network' };

        const body = await res.json();
        await store.ack(batch.map(op => op.seq));
        pushed += records.length;
        // rejected 交由上层：manager 先按权威值覆盖本地，再把明细冒给 UI 订阅者（G1506）
        if (opts.onRejected) opts.onRejected(body.rejected ?? []);
        // 继续下一批（hasMore 语义由 store 里还有没有 pending 决定）
      }
    },
  };
}
