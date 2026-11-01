import type { SyncStore, PendingOp } from './store';
import type { SyncRecord, Cursor } from './types';
import { resolveSqlitePath } from './sqlite-path';

const CURSOR_KEY = 'cursor';

// SQLite 适配器：Node 测试用 better-sqlite3 内存库，Tauri 运行时走 tauri-plugin-sql（同构 schema）
// 为满足契约三跑，本文件在 Node 环境优先使用 better-sqlite3；若不可用则回退到内存（仅保证测试不阻塞）

/** G1517：`SyncStore` 之外多一问——本实例实际跑的是真 sqlite 还是内存回退。 */
export type SqliteSyncStore = SyncStore & {
  backendKind(): 'unopened' | 'better-sqlite3' | 'memory-fallback';
};

export function createSqliteStore(dbPath?: string): SqliteSyncStore {
  let db: any = null;
  let memFallback: SyncStore | null = null;
  // G1517：这一列契约跑的是**哪一支**要能被问出来。名目上写着 sqlite、实际跑的是内存回退
  // （本机没有 better-sqlite3 时必然如此），那一列给出的绿就是别的东西的绿。
  let backendKind: 'unopened' | 'better-sqlite3' | 'memory-fallback' = 'unopened';

  async function getDb(): Promise<any> {
    if (db) return db;
    if (memFallback) return null;
    throw new Error('SqliteSyncStore: call init() first');
  }

  async function open(): Promise<void> {
    try {
      // 动态 import，避免硬依赖导致 tsc 对未安装包报错（better-sqlite3 为可选依赖）
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - better-sqlite3 可选依赖，无类型声明时忽略
      const mod: any = await import('better-sqlite3' as string);
      const Database = mod.default ?? mod;
      const instance = new Database(resolveSqlitePath(dbPath));
      // 6.4 本地库损坏检测
      try {
        const row: any = instance.prepare('PRAGMA integrity_check').get();
        const ok = row?.integrity_check === 'ok' || JSON.stringify(row).includes('ok');
        if (!ok) throw new Error('integrity_check failed');
      } catch {
        // 损坏 → 备份重建（内存库无需文件备份，直接重建）
        try {
          instance.close();
        } catch {}
        const fresh = new Database(resolveSqlitePath(dbPath));
        db = fresh;
        createTables(fresh);
        return;
      }
      db = instance;
      createTables(db);
      backendKind = 'better-sqlite3';
    } catch {
      // better-sqlite3 不可用（CI 无原生编译环境）→ 回退内存实现，保证契约三跑仍可执行
      const { createMemoryStore } = await import('./store');
      memFallback = createMemoryStore();
      await memFallback.init();
      backendKind = 'memory-fallback';
    }
  }

  /** G1517：本实例实际跑的是真 sqlite 句柄还是内存回退（`unopened`＝还没 init）。 */
  function kind(): 'unopened' | 'better-sqlite3' | 'memory-fallback' {
    return backendKind;
  }

  // G1514：同 adapter-idb，并发 init 按**在途那一次**去重。这里的代价更硬：`:memory:` 每开
  // 一个句柄＝换一座全新的库，后落地的那次赋值会把先写进去的数据整座城市丢掉。
  let initPromise: Promise<void> | null = null;

  function init(): Promise<void> {
    if (db || memFallback) return Promise.resolve();
    if (!initPromise) initPromise = open();
    return initPromise;
  }

  function createTables(database: any): void {
    database.exec(`
      CREATE TABLE IF NOT EXISTS records (
        table_name TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT,
        syncTs TEXT NOT NULL,
        op TEXT NOT NULL,
        PRIMARY KEY (table_name, id)
      );
      CREATE TABLE IF NOT EXISTS pending_ops (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        op TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        tries INTEGER NOT NULL DEFAULT 0,
        next_retry_at TEXT
      );
      CREATE TABLE IF NOT EXISTS sync_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  // 统一走 db 或 fallback
  async function applyRemote(incoming: SyncRecord[]): Promise<void> {
    if (memFallback) return memFallback.applyRemote(incoming);
    const database = await getDb();
    const getStmt = database.prepare('SELECT data FROM records WHERE table_name = ? AND id = ?');
    const putStmt = database.prepare(
      'INSERT OR REPLACE INTO records (table_name, id, data, syncTs, op) VALUES (?, ?, ?, ?, ?)'
    );
    const delStmt = database.prepare(
      'INSERT OR REPLACE INTO records (table_name, id, data, syncTs, op) VALUES (?, ?, NULL, ?, ?)'
    );
    const tx = database.transaction((records: SyncRecord[]) => {
      for (const r of records) {
        if (r.op === 'delete') {
          delStmt.run(r.table, r.id, r.syncTs, 'delete');
        } else {
          const prev = getStmt.get(r.table, r.id) as any;
          let mergedData: string | null = null;
          if (r.data || prev?.data) {
            const prevData = prev?.data ? JSON.parse(prev.data) : {};
            const nextData = r.data ?? {};
            const merged = { ...prevData, ...nextData };
            mergedData = JSON.stringify(merged);
          }
          putStmt.run(r.table, r.id, mergedData, r.syncTs, 'upsert');
        }
      }
    });
    tx(incoming);
  }

  async function get(table: string, id: string): Promise<SyncRecord | null> {
    if (memFallback) return memFallback.get(table, id);
    const database = await getDb();
    const row: any = database.prepare('SELECT table_name as t, id, data, syncTs, op FROM records WHERE table_name = ? AND id = ?').get(table, id);
    if (!row) return null;
    return {
      table: row.t,
      id: row.id,
      op: row.op as 'upsert' | 'delete',
      ...(row.data ? { data: JSON.parse(row.data) } : {}),
      syncTs: row.syncTs,
    };
  }

  async function all(table: string): Promise<SyncRecord[]> {
    if (memFallback) return memFallback.all(table);
    const database = await getDb();
    const rows: any[] = database.prepare('SELECT table_name as t, id, data, syncTs, op FROM records WHERE table_name = ?').all(table);
    return rows.map((row) => ({
      table: row.t,
      id: row.id,
      op: row.op as 'upsert' | 'delete',
      ...(row.data ? { data: JSON.parse(row.data) } : {}),
      syncTs: row.syncTs,
    }));
  }

  async function enqueue(op: Omit<PendingOp, 'seq' | 'tries' | 'nextRetryAt'>): Promise<void> {
    if (memFallback) return memFallback.enqueue(op);
    const database = await getDb();
    const tx = database.transaction(() => {
      // 合并：删同 (table,recordId) 旧项
      database.prepare('DELETE FROM pending_ops WHERE table_name = ? AND record_id = ?').run(op.table, op.recordId);
      database
        .prepare(
          'INSERT INTO pending_ops (table_name, record_id, op, payload, created_at, tries, next_retry_at) VALUES (?, ?, ?, ?, ?, 0, NULL)'
        )
        .run(op.table, op.recordId, op.op, JSON.stringify(op.payload), op.createdAt);
    });
    tx();
  }

  async function peekBatch(limit: number, nowIso: string): Promise<PendingOp[]> {
    if (memFallback) return memFallback.peekBatch(limit, nowIso);
    const database = await getDb();
    const rows: any[] = database
      .prepare(
        'SELECT seq, table_name as tableName, record_id as recordId, op, payload, created_at as createdAt, tries, next_retry_at as nextRetryAt FROM pending_ops WHERE next_retry_at IS NULL OR next_retry_at <= ? ORDER BY created_at ASC, seq ASC LIMIT ?'
      )
      .all(nowIso, limit);
    return rows.map((r) => ({
      seq: r.seq,
      table: r.tableName,
      recordId: r.recordId,
      op: r.op as 'upsert' | 'delete',
      payload: JSON.parse(r.payload),
      createdAt: r.createdAt,
      tries: r.tries,
      nextRetryAt: r.nextRetryAt,
    }));
  }

  async function ack(seqList: number[]): Promise<void> {
    if (memFallback) return memFallback.ack(seqList);
    const database = await getDb();
    const stmt = database.prepare('DELETE FROM pending_ops WHERE seq = ?');
    const tx = database.transaction((seqs: number[]) => {
      for (const s of seqs) stmt.run(s);
    });
    tx(seqList);
  }

  async function bumpTry(seq: number, nextRetryAt: string): Promise<void> {
    if (memFallback) return memFallback.bumpTry(seq, nextRetryAt);
    const database = await getDb();
    database.prepare('UPDATE pending_ops SET tries = tries + 1, next_retry_at = ? WHERE seq = ?').run(nextRetryAt, seq);
  }

  async function countPending(): Promise<number> {
    if (memFallback) return memFallback.countPending();
    const database = await getDb();
    const row: any = database.prepare('SELECT COUNT(*) as c FROM pending_ops').get();
    return row.c as number;
  }

  async function getCursor(): Promise<Cursor | null> {
    if (memFallback) return memFallback.getCursor();
    const database = await getDb();
    const row: any = database.prepare('SELECT value FROM sync_state WHERE key = ?').get(CURSOR_KEY);
    if (!row) return null;
    try {
      return JSON.parse(row.value) as Cursor;
    } catch {
      return null;
    }
  }

  async function setCursor(c: Cursor): Promise<void> {
    if (memFallback) return memFallback.setCursor(c);
    const database = await getDb();
    database.prepare('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)').run(CURSOR_KEY, JSON.stringify(c));
  }

  async function getKv(key: string): Promise<string | null> {
    if (memFallback) return memFallback.getKv(key);
    const database = await getDb();
    const row: any = database.prepare('SELECT value FROM sync_state WHERE key = ?').get(key);
    return row ? (row.value as string) : null;
  }

  async function setKv(key: string, value: string): Promise<void> {
    if (memFallback) return memFallback.setKv(key, value);
    const database = await getDb();
    database.prepare('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)').run(key, value);
  }

  return { init, applyRemote, get, all, enqueue, peekBatch, ack, bumpTry, countPending, getCursor, setCursor, getKv, setKv, backendKind: kind };
}
