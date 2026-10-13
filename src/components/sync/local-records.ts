// src/components/sync/local-records.ts
// UI 读侧与 sync 本地库（IndexedDB）之间的桥：
// 服务端 action 返回的是「推送前」的旧数据，本地 applyLocal 的写要靠 pending 队列
// 覆盖（mergePending）才能即时可见；flush ack 后服务端即权威，pending 自然清空。
import { createIdbStore } from '@/lib/sync-core/adapter-idb';
import { createSqliteStore } from '@/lib/sync-core/adapter-sqlite';
import { storageBackend } from '@/lib/platform';
import type { SyncStore } from '@/lib/sync-core/store';

let store: SyncStore | null = null;

async function getStore(): Promise<SyncStore> {
  if (!store) store = storageBackend() === 'sqlite' ? createSqliteStore() : createIdbStore();
  await store.init();   // 幂等：已 init 直接返回
  return store;
}

export interface PendingRow {
  op: 'upsert' | 'delete';
  data?: Record<string, unknown>;
  syncTs: string;
}

/**
 * 读取某表全部未推送 op（含退避中的、在途未 ack 的）。
 * 队列对同 (table, recordId) 只保留最后一条，Map 即最终意图。
 * 读失败（IDB 不可用等）返回空 Map —— 退化为纯服务端视图，不阻塞 UI。
 */
export async function readPendingRows(table: string): Promise<Map<string, PendingRow>> {
  const out = new Map<string, PendingRow>();
  try {
    const s = await getStore();
    const ops = await s.peekBatch(Number.MAX_SAFE_INTEGER, '9999-12-31T23:59:59.999Z');
    for (const op of ops) {
      if (op.table !== table) continue;
      out.set(op.recordId, {
        op: op.op,
        data: op.payload.data,
        syncTs: op.payload.syncTs,
      });
    }
  } catch {
    // 本地库不可用：不覆盖，按服务端数据渲染
  }
  return out;
}

/** 本地全量镜像读取（拉取对账后的缓存；用于查复合键 id，如 favorite/document_share）。 */
export async function readLocalRecords(table: string): Promise<Array<{ id: string; op: string; data?: Record<string, unknown> }>> {
  try {
    const s = await getStore();
    return await s.all(table);
  } catch {
    return [];
  }
}

/**
 * 把「未推送的本地意图」合并进服务端行集合：
 * - upsert 且服务端有同 id 行 → 变更字段覆盖（本地优先，语义上服务端还没有这次写）
 * - upsert 且服务端没有 → 新增行（defaults 造骨架，再盖 data；create 的 patch 带全字段）
 * - delete 墓碑 → 丢弃服务端行、也不新增
 * 过滤条件（isDeleted 等）由调用方在合并后统一施加。
 */
export function mergePending<T extends { id: string }>(
  serverRows: T[],
  pending: Map<string, PendingRow>,
  defaults: (id: string, p: PendingRow) => T,
): T[] {
  const serverIds = new Set(serverRows.map(r => r.id));
  const out: T[] = [];
  for (const row of serverRows) {
    const p = pending.get(row.id);
    if (!p) {
      out.push(row);
      continue;
    }
    if (p.op === 'delete') continue;   // 本地意图是删除：视图里去掉
    out.push({ ...row, ...(p.data as Partial<T>) });
  }
  for (const [id, p] of pending) {
    if (p.op === 'delete') continue;
    if (serverIds.has(id)) continue;   // 已在上面处理（覆盖或丢弃）
    out.push({ ...defaults(id, p), ...(p.data as Partial<T>) });
  }
  return out;
}

/** 找该文档当前生效的 favorite 行 id（本地镜像；tombstone 不算）。 */
export async function findLiveFavoriteId(documentId: string): Promise<string | null> {
  const rows = await readLocalRecords('favorite');
  for (const r of rows) {
    if (r.op === 'delete') continue;
    if (r.data?.documentId !== documentId) continue;
    if (r.data.deletedAt) continue;
    return r.id;
  }
  return null;
}

/** 找该文档的 document_share 行 id（getOrCreateShare 不回传 id，走本地镜像补）。 */
export async function findDocumentShareId(documentId: string): Promise<string | null> {
  const rows = await readLocalRecords('document_share');
  for (const r of rows) {
    if (r.op === 'delete') continue;
    if (r.data?.documentId !== documentId) continue;
    if (r.data.deletedAt) continue;
    return r.id;
  }
  return null;
}
