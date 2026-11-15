import { parseCursor, formatCursor, cmpCursor, type Cursor } from '@/lib/sync/cursor';
import { SYNC_TABLES } from '@/lib/sync/tables';
import type { SyncRecord, SyncStore } from './store';
import { resolveConflict, type PendingIntentLike } from './conflict-resolve';

export interface Reconciler {
  pull(opts?: { full?: boolean }): Promise<{ applied: number; deletedLocally: string[] }>;
}

export class SyncAuthError extends Error {
  constructor() { super('401'); this.name = 'SyncAuthError'; }
}

const PULL_LIMIT = 500;   // spec 常量表

/**
 * `gap.md` G1635 —— 首轮全量对账（spec 6.4）的**表清单此前是手抄的 5 张**：
 * `document`／`folder`／`tag`／`favorite`／`task`。注释给的理由是"其余表删除以墓碑形式在
 * 30 天内到达"—— 那只对**带 `deletedAt` 的表**成立，而且只在墓碑还没被服务端清掉时成立：
 *  - `document_member`／`notification` 是**硬删**：删行不在增量流里留任何痕迹；
 *  - 任何带墓碑的表，在设备离线超过 30 天后墓碑已被 `purgeTombstones` 物理删除。
 * 两种情况下本地镜像都会永远留着一条服务端早已不存在的行——而全量对账正是 spec 6.4 为
 * "离线超 30 天"准备的唯一兜底。所以这里不再维护第二份名单：**同步表全部参与对账**，
 * 清单直接取 `SYNC_TABLES`（与 `purgePlan`／`createRequires`／`WRITE_SCOPES` 同一手法）。
 *
 * ☆ 但必须先问 pending：本机未上报的 `applyLocal`（离线新建/改动）此刻还不在服务端，
 *   "全量里没有它"正是它的正常状态——照删就把用户自己的工作当成陈旧行清掉了。
 *   `pendingKeys()` 读不到时不删任何行（宁可留一条陈旧行，也不删用户未上报的改动）。
 */
async function pendingKeys(store: SyncStore): Promise<Set<string> | null> {
  try {
    // 与 `index.ts` 的 handleRejected 同一手法：取"全部 pending"，不受退避时刻影响。
    const ops = await store.peekBatch(Number.MAX_SAFE_INTEGER, '9999-12-31T23:59:59.999Z');
    return new Set(ops.map((op) => `${op.table}::${op.recordId}`));
  } catch {
    return null;
  }
}

// C4 父墓碑收养（spec 5.7 C4）：字段 → 被引用行所在表
// document.folderId → Folder 树；document.parentId → Document 树；folder.parentId → Folder 树
const PARENT_REFS = [
  { table: 'document', field: 'folderId', refTable: 'folder' },
  { table: 'document', field: 'parentId', refTable: 'document' },
  { table: 'folder', field: 'parentId', refTable: 'folder' },
] as const;

export function createReconciler(store: SyncStore, opts: { fetchImpl?: typeof fetch }): Reconciler {
  const fetchImpl = opts.fetchImpl ?? fetch;

  // 每次 applyRemote 后的收养步：引用指向 op='delete' 行的子行，置空引用迁至根（待整理）。
  // 放在 reconciler 的 apply 步（brief Step 3 未含此逻辑）；full / 普通 pull 均生效。
  // 注意：不改动 store 返回的对象本体——一律展开新建后再 applyRemote。
  async function adoptOrphans(): Promise<void> {
    for (const { table, field, refTable } of PARENT_REFS) {
      for (const row of await store.all(table)) {
        if (row.op === 'delete' || !row.data) continue;
        const ref = row.data[field];
        if (typeof ref !== 'string' || ref === '') continue;
        const parent = await store.get(refTable, ref);
        if (parent?.op === 'delete') {
          await store.applyRemote([{ ...row, data: { ...row.data, [field]: null } }]);
        }
      }
    }
  }

  /**
   * G440/G441/G442 —— 服务端这批记录里有"本地也改过、还没推上去"的那几条时，走三方合并而不是
   * 直接盖回。共同祖先＝**应用这批之前**本地镜像里那一份（本地镜像就是上次与服务端对齐后的值），
   * 未上报意图取自 pending。合出来那条以合并结果为准再交给 `applyRemote`；合不出来（`adopt`）
   * 原样交给 `applyRemote`（服务端为准）。
   * ☆ 先整体读出祖先与 pending，再一次性改写，避免逐条 `store.get` 造成 N 次开库往返。
   */
  async function reconcileIncoming(records: SyncRecord[]): Promise<SyncRecord[]> {
    if (!records.length) return records;
    let pendingByKey: Map<string, PendingIntentLike>;
    try {
      const pending = await store.peekBatch(Number.MAX_SAFE_INTEGER, '9999-12-31T23:59:59.999Z');
      pendingByKey = new Map(pending.map((op) => [`${op.table}::${op.recordId}`, op]));
    } catch {
      // 读不到 pending ⇒ 没有未上报改动的证据，按老路（服务端为准）走，绝不因为读失败丢服务端值。
      return records;
    }
    if (!pendingByKey.size) return records;

    const out: SyncRecord[] = [];
    for (const record of records) {
      const key = `${record.table}::${record.id}`;
      const pending = pendingByKey.get(key);
      if (!pending) {
        out.push(record);
        continue;
      }
      const localMirror = await store.get(record.table, record.id);
      const resolved = resolveConflict({
        table: record.table,
        id: record.id,
        server: record,
        localMirror,
        pending: {
          table: pending.table,
          recordId: pending.recordId,
          op: pending.op,
          payload: pending.payload,
        },
      });
      if (resolved.decision === 'merge') {
        out.push({ ...record, data: resolved.data, syncTs: pending.payload.syncTs });
      } else {
        out.push(record);
      }
    }
    return out;
  }

  return {
    async pull(pullOpts = {}) {
      let applied = 0;
      const deletedLocally: string[] = [];
      let since = pullOpts.full ? null : await store.getCursor();

      // 首轮全量：记录远端出现过的键，结束后收养本地孤儿（spec 6.4）
      const seen = pullOpts.full ? new Set<string>() : null;

      for (;;) {
        const url = since
          ? `/api/v1/sync?since=${encodeURIComponent(formatCursor(since))}&limit=${PULL_LIMIT}`
          : `/api/v1/sync?limit=${PULL_LIMIT}`;
        const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
        if (res.status === 401) throw new SyncAuthError();
        if (!res.ok) throw new Error(`pull failed: ${res.status}`);
        const body = await res.json();

        // 断点续拉：每批即应用 + 收养（C4）后再取下一页
        await store.applyRemote(await reconcileIncoming(body.records));
        await adoptOrphans();
        applied += body.records.length;
        if (seen) for (const r of body.records) seen.add(`${r.table}::${r.id}`);

        const next: Cursor | null = parseCursor(body.cursor);
        const advanced = next !== null && (since === null || cmpCursor(next, since) > 0);
        if (next && advanced) {
          await store.setCursor(next);      // 游标只前进（回环抑制）
          since = next;
        }
        if (!body.hasMore) break;
        // hasMore=true 却无法推进游标 → 服务端 bug（T4 空页游标 / 回环），抛错而非空转
        if (!advanced) {
          throw new Error(
            next === null
              ? `pull stalled: hasMore=true but server cursor is unparseable: ${JSON.stringify(body.cursor)}`
              : `pull stalled: hasMore=true but server cursor did not advance past since=${formatCursor(since!)}`
          );
        }
      }

      if (seen) {
        // G1635：清单＝全部同步表（不再手抄 5 张）；本机未上报的行不算孤儿。
        // ☆ `user` 例外：它是账号设置行、永远只有本地这一个 id，GET 正常必带它；把它也纳入
        //   对账，等于"服务端那一行暂时读不到就把本机设置整份判死"（主题/字体随之回落），
        //   而它没有"孤儿"这个概念——行不存在时正确的动作是等下次写把它带上去，不是删。
        const pending = await pendingKeys(store);
        if (pending) {
          for (const def of SYNC_TABLES) {
            if (def.table === 'user') continue;
            const stale: SyncRecord[] = [];
            for (const row of await store.all(def.table)) {
              if (row.op === 'delete' || seen.has(`${row.table}::${row.id}`)) continue;
              if (pending.has(`${row.table}::${row.id}`)) continue;
              stale.push({ ...row, op: 'delete', syncTs: new Date().toISOString() });
            }
            if (stale.length) await store.applyRemote(stale);
            for (const row of stale) deletedLocally.push(`${row.table}::${row.id}`);
          }
        }
        // 全量判定可能制造新墓碑 → 子引用随之收养
        await adoptOrphans();
      }
      // I7：仅成功走到这里才记账（401/5xx 抛错在前）——boot 据此判断 30d 全量对账
      await store.setKv('lastPullAt', new Date().toISOString());
      return { applied, deletedLocally };
    },
  };
}
