import type { Cursor, PendingOp, SyncRecord } from './types';

export type { Cursor, PendingOp, SyncRecord };

export interface SyncStore {
  init(): Promise<void>;
  applyRemote(records: SyncRecord[]): Promise<void>;           // 合并 upsert / 标墓碑 delete
  get(table: string, id: string): Promise<SyncRecord | null>;
  all(table: string): Promise<SyncRecord[]>;                   // 本地全量（首轮对账用）
  enqueue(op: Omit<PendingOp, 'seq' | 'tries' | 'nextRetryAt'>): Promise<void>;
  // 同 (table,recordId) 合并保留最后一条（spec 5.5 步骤2）
  peekBatch(limit: number, nowIso: string): Promise<PendingOp[]>; // 仅 next_retry_at<=now
  ack(seqList: number[]): Promise<void>;
  bumpTry(seq: number, nextRetryAt: string): Promise<void>;
  countPending(): Promise<number>;
  getCursor(): Promise<Cursor | null>;
  setCursor(c: Cursor): Promise<void>;
  // I7：sync_state 通用 kv（lastPullAt 等键值状态；与 cursor 键空间并存）
  getKv(key: string): Promise<string | null>;
  setKv(key: string, value: string): Promise<void>;
}

export function createMemoryStore(): SyncStore {
  const records = new Map<string, SyncRecord>(); // key: `${table}::${id}`
  const pending = new Map<number, PendingOp>();  // key: seq
  const kv = new Map<string, string>();          // key: kv 键（如 lastPullAt）
  let seq = 0;
  let cursor: Cursor | null = null;

  const recKey = (table: string, id: string) => `${table}::${id}`;

  async function init(): Promise<void> {
    // 内存实现无需初始化
  }

  async function applyRemote(incoming: SyncRecord[]): Promise<void> {
    for (const r of incoming) {
      const key = recKey(r.table, r.id);
      if (r.op === 'delete') {
        // 墓碑：行保留，仅标记 op，供 UI/对账识别删除
        records.set(key, { table: r.table, id: r.id, op: 'delete', syncTs: r.syncTs });
      } else {
        // upsert：data 合并覆盖到已有行
        const prev = records.get(key);
        const data = prev?.data || r.data ? { ...prev?.data, ...r.data } : undefined;
        records.set(key, { ...r, data });
      }
    }
  }

  async function get(table: string, id: string): Promise<SyncRecord | null> {
    return records.get(recKey(table, id)) ?? null;
  }

  async function all(table: string): Promise<SyncRecord[]> {
    const prefix = `${table}::`;
    const out: SyncRecord[] = [];
    for (const [key, rec] of records) {
      if (key.startsWith(prefix)) out.push(rec);
    }
    return out;
  }

  async function enqueue(op: Omit<PendingOp, 'seq' | 'tries' | 'nextRetryAt'>): Promise<void> {
    // 合并语义：先删同 (table,recordId) 已有项再插入，只保留最后一条
    for (const [k, v] of pending) {
      if (v.table === op.table && v.recordId === op.recordId) pending.delete(k);
    }
    pending.set(++seq, { ...op, seq, tries: 0, nextRetryAt: null });
  }

  async function peekBatch(limit: number, nowIso: string): Promise<PendingOp[]> {
    return [...pending.values()]
      .filter((op) => op.nextRetryAt === null || op.nextRetryAt <= nowIso)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.seq - b.seq))
      .slice(0, limit);
  }

  async function ack(seqList: number[]): Promise<void> {
    for (const s of seqList) pending.delete(s);
  }

  async function bumpTry(s: number, nextRetryAt: string): Promise<void> {
    const op = pending.get(s);
    if (op) pending.set(s, { ...op, tries: op.tries + 1, nextRetryAt });
  }

  async function countPending(): Promise<number> {
    return pending.size;
  }

  async function getCursor(): Promise<Cursor | null> {
    return cursor ? { ...cursor } : null;
  }

  async function setCursor(c: Cursor): Promise<void> {
    cursor = { ...c };
  }

  async function getKv(key: string): Promise<string | null> {
    return kv.get(key) ?? null;
  }

  async function setKv(key: string, value: string): Promise<void> {
    kv.set(key, value);
  }

  return { init, applyRemote, get, all, enqueue, peekBatch, ack, bumpTry, countPending, getCursor, setCursor, getKv, setKv };
}
