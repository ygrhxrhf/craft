import { openDB, type IDBPDatabase } from 'idb';
import type { SyncStore, PendingOp } from './store';
import type { SyncRecord, Cursor } from './types';

export const SYNC_DB_NAME = 'crafty-sync';
const DB_VERSION = 1;
const RECORDS = 'records';   // key: `${table}::${id}`；value: SyncRecord
const PENDING = 'pending';   // keyPath: seq
const KV = 'kv';             // 'cursor' -> Cursor
const CURSOR_KEY = 'cursor';

export function createIdbStore(): SyncStore {
  let db: IDBPDatabase | null = null;

  function requireDb(): IDBPDatabase {
    if (!db) throw new Error('IdbSyncStore: call init() first');
    return db;
  }

  async function init(): Promise<void> {
    if (db) return;
    db = await openDB(SYNC_DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(RECORDS)) {
          // out-of-line key: `${table}::${id}`
          database.createObjectStore(RECORDS);
        }
        if (!database.objectStoreNames.contains(PENDING)) {
          const store = database.createObjectStore(PENDING, { keyPath: 'seq' });
          store.createIndex('by-retry', 'nextRetryAt');
        }
        if (!database.objectStoreNames.contains(KV)) {
          database.createObjectStore(KV);
        }
      },
      blocking() {
        // 另一连接请求删库/升级时主动让路（测试隔离用），避免 deleteDatabase 永久阻塞
        if (db) {
          db.close();
          db = null;
        }
      },
    });
  }

  async function applyRemote(incoming: SyncRecord[]): Promise<void> {
    const d = requireDb();
    const tx = d.transaction(RECORDS, 'readwrite');
    const store = tx.objectStore(RECORDS);
    for (const r of incoming) {
      const key = `${r.table}::${r.id}`;
      const prev = (await store.get(key)) as SyncRecord | undefined;
      if (r.op === 'delete') {
        // 墓碑：行保留，仅标记 op，供 UI/对账识别删除
        await store.put({ table: r.table, id: r.id, op: 'delete', syncTs: r.syncTs }, key);
      } else {
        // upsert：data 合并覆盖到已有行
        const data = prev?.data || r.data ? { ...prev?.data, ...r.data } : undefined;
        await store.put({ ...r, data }, key);
      }
    }
    await tx.done;
  }

  async function get(table: string, id: string): Promise<SyncRecord | null> {
    const rec = (await requireDb().get(RECORDS, `${table}::${id}`)) as SyncRecord | undefined;
    return rec ?? null;
  }

  async function all(table: string): Promise<SyncRecord[]> {
    const rows = (await requireDb().getAll(RECORDS)) as SyncRecord[];
    return rows.filter((r) => r.table === table);
  }

  async function enqueue(op: Omit<PendingOp, 'seq' | 'tries' | 'nextRetryAt'>): Promise<void> {
    const d = requireDb();
    const tx = d.transaction(PENDING, 'readwrite');
    const store = tx.objectStore(PENDING);
    const existing = (await store.getAll()) as PendingOp[];
    let maxSeq = 0;
    for (const p of existing) {
      if (p.seq > maxSeq) maxSeq = p.seq;
      if (p.table === op.table && p.recordId === op.recordId) {
        // 合并语义：删同 (table,recordId) 旧项，仅保留最后一条 payload
        await store.delete(p.seq);
      }
    }
    await store.put({ ...op, seq: maxSeq + 1, tries: 0, nextRetryAt: null });
    await tx.done;
  }

  async function peekBatch(limit: number, nowIso: string): Promise<PendingOp[]> {
    // 单用户队列量级：getAll 后内存过滤排序（索引优化留待 P3）
    const rows = (await requireDb().getAll(PENDING)) as PendingOp[];
    return rows
      .filter((op) => op.nextRetryAt === null || op.nextRetryAt <= nowIso)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.seq - b.seq))
      .slice(0, limit);
  }

  async function ack(seqList: number[]): Promise<void> {
    const d = requireDb();
    const tx = d.transaction(PENDING, 'readwrite');
    const store = tx.objectStore(PENDING);
    for (const s of seqList) await store.delete(s);
    await tx.done;
  }

  async function bumpTry(seq: number, nextRetryAt: string): Promise<void> {
    const d = requireDb();
    const tx = d.transaction(PENDING, 'readwrite');
    const store = tx.objectStore(PENDING);
    const op = (await store.get(seq)) as PendingOp | undefined;
    if (op) await store.put({ ...op, tries: op.tries + 1, nextRetryAt });
    await tx.done;
  }

  async function countPending(): Promise<number> {
    return requireDb().count(PENDING);
  }

  async function getCursor(): Promise<Cursor | null> {
    const c = (await requireDb().get(KV, CURSOR_KEY)) as Cursor | undefined;
    return c ? { ...c } : null;
  }

  async function setCursor(c: Cursor): Promise<void> {
    await requireDb().put(KV, { ...c }, CURSOR_KEY);
  }

  return { init, applyRemote, get, all, enqueue, peekBatch, ack, bumpTry, countPending, getCursor, setCursor };
}
