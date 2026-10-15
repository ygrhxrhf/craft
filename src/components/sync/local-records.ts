// src/components/sync/local-records.ts
// UI 读侧与 sync 本地库（IndexedDB）之间的桥：
// 服务端 action 返回的是「推送前」的旧数据，本地 applyLocal 的写要靠 pending 队列
// 覆盖（mergePending）才能即时可见；flush ack 后服务端即权威，pending 自然清空。
// G1516：读侧**不再自开一份 store 单例**——向内核要那座库（`readyStore()`，已过开库闸门）。
//   以前两处各开一份：浏览器上看不出（idb 按库名开、两个句柄指同一座库），而桌面
//   `createSqliteStore()` 写死 `:memory:` ⇒ 两座互不相通的库（离线写入既不上屏也不跨重启）。
import { getSyncManager } from '@/lib/sync-core';
import type { SyncStore } from '@/lib/sync-core/store';

async function getStore(): Promise<SyncStore> {
  // ☆ 内核门面自己会先开库（G1514／G1518），这里不必再 `store.init()`
  return await getSyncManager().readyStore();
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

/**
 * 该文档当前生效的 favorite 行 id（本地镜像；tombstone 不算）。
 * 返回全部而非第一条：跨设备新建 + 本地乐观建行会让镜像里同一个人的同一文档挂着两行，
 * 取消收藏只墓碑其中一行，另一行仍是活的，星号就「取消不掉」。
 */
export async function findLiveFavoriteIds(documentId: string): Promise<string[]> {
  const rows = await readLocalRecords('favorite');
  return rows
    .filter((r) => r.op !== 'delete' && r.data?.documentId === documentId && !r.data.deletedAt)
    .map((r) => r.id);
}

/**
 * 该文档的 favorite 行 id，**含墓碑**。收藏必须复用这个 id：
 * 唯一键 `@@unique([userId,documentId])` 不认 deletedAt，客户端盲建新 id 会撞上存量墓碑行。
 */
export async function findFavoriteRowId(documentId: string): Promise<string | null> {
  const rows = await readLocalRecords('favorite');
  const row = rows.find((r) => r.data?.documentId === documentId);
  return row ? row.id : null;
}

/** 面板视图（本地镜像那一枚 `document_share` 行解出来的形状）。口令只报「有没有」，明文不外传。 */
export interface DocumentShareView {
  id: string;
  token?: string;
  slug?: string | null;
  isPublished?: boolean;
  hasPasscode?: boolean;
  permission?: string;
  /** G38：发布页「显示作者」（缺列＝旧镜像行，按默认显示）。 */
  showAuthor?: boolean;
  /** G1534：visual.options 其余四组（缺列＝旧镜像行，按官方默认）。 */
  showPageTitle?: boolean;
  hideTableOfContents?: boolean;
  hidePresentationMode?: boolean;
  showWatermark?: boolean;
  /** G143：搜索引擎索引（缺列＝旧镜像行，按官方默认 false）。 */
  enableSeo?: boolean;
  shareVersion?: number;
}

/**
 * 纯函数：把一枚本地镜像行（`{id, data}`）解成面板视图。tombstone／他篇的行由调用方先滤掉。
 * 缺字段一律留 `undefined`（＝"这一列镜像里没有"，与"值是 null/false"要分得开：面板据此决定
 * 覆不覆盖已有 state）。
 */
export function shareViewFromRow(id: string, data: Record<string, unknown>): DocumentShareView {
  return {
    id,
    token: typeof data.token === 'string' ? data.token : undefined,
    slug: data.slug === undefined ? undefined : typeof data.slug === 'string' ? data.slug : null,
    isPublished: typeof data.isPublished === 'boolean' ? data.isPublished : undefined,
    hasPasscode: typeof data.passcode === 'string' ? data.passcode.length > 0 : false,
    permission: typeof data.permission === 'string' ? data.permission : undefined,
    showAuthor: typeof data.showAuthor === 'boolean' ? data.showAuthor : undefined,
    showPageTitle: typeof data.showPageTitle === 'boolean' ? data.showPageTitle : undefined,
    hideTableOfContents: typeof data.hideTableOfContents === 'boolean' ? data.hideTableOfContents : undefined,
    hidePresentationMode: typeof data.hidePresentationMode === 'boolean' ? data.hidePresentationMode : undefined,
    showWatermark: typeof data.showWatermark === 'boolean' ? data.showWatermark : undefined,
    enableSeo: typeof data.enableSeo === 'boolean' ? data.enableSeo : undefined,
    shareVersion: typeof data.shareVersion === 'number' ? data.shareVersion : undefined,
  };
}

/**
 * 该文档的 `document_share` 行（本地镜像；tombstone 不算），含改档要带的那两列。
 * ☆ `shareVersion` 只有 `cols` 里带了它才拉得回来（G1491 本批补进去）：客户端改档要算的是
 *   `max(服务端已知值, 镜像值) + 1`，只看镜像会在镜像比服务端旧时把这个计数器**往回拨**，
 *   而它存在的意义就是"按旧档授权的那条连接要被认成过期"。
 * ☆ 本批（G1508）扩到整份面板视图：面板不再"挂载即读服务端"，镜像有这一行就当场渲染档位、
 *   发布态、口令态与 slug——断链时看得见现值。
 */
export async function findDocumentShare(documentId: string): Promise<DocumentShareView | null> {
  const rows = await readLocalRecords('document_share');
  for (const r of rows) {
    if (r.op === 'delete') continue;
    if (r.data?.documentId !== documentId) continue;
    if (r.data.deletedAt) continue;
    return shareViewFromRow(r.id, r.data);
  }
  return null;
}

/** 只要 id 的那一路（发布开关用）：`getOrCreateShare` 不回传 id，走本地镜像补。 */
export async function findDocumentShareId(documentId: string): Promise<string | null> {
  return (await findDocumentShare(documentId))?.id ?? null;
}

/** G1520：显示名缓存的 kv 键（落内核同一座库的通用 kv 段，与 cursor/lastPullAt 并存）。 */
const USER_DISPLAY_KV = 'user_display';

/**
 * 读回落的显示名缓存（`rememberUserDisplay` 学到的那半截）。读不到／坏 JSON 一律返回 null，
 * 调用方按"缓存还没落过"处理，不阻塞。
 */
export async function readUserDisplayCache(): Promise<
  Array<[string, { name: string | null; email: string }]> | null
> {
  try {
    const raw = await (await getStore()).getKv(USER_DISPLAY_KV);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** 把显示名缓存写进内核的 kv 段（失败静默：这只是缓存，不是主数据）。 */
export async function writeUserDisplayCache(entries: unknown): Promise<void> {
  try {
    await (await getStore()).setKv(USER_DISPLAY_KV, JSON.stringify(entries));
  } catch {
    // 本地库不可用：缓存丢失不影响主流程，下一次邀请会重新学到
  }
}
