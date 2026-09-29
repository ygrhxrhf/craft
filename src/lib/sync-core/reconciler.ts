import { parseCursor, formatCursor, cmpCursor, type Cursor } from '@/lib/sync/cursor';
import type { SyncRecord, SyncStore } from './store';

export interface Reconciler {
  pull(opts?: { full?: boolean }): Promise<{ applied: number; deletedLocally: string[] }>;
}

export class SyncAuthError extends Error {
  constructor() { super('401'); this.name = 'SyncAuthError'; }
}

const PULL_LIMIT = 500;   // spec 常量表

// R-2：首轮全量孤儿判定仅遍历这 5 张表（其余表删除以墓碑形式在 30d 内到达，spec 6.4）
const FULL_RECONCILE_TABLES = ['document', 'folder', 'tag', 'favorite', 'task'] as const;

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
        await store.applyRemote(body.records);
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
        for (const table of FULL_RECONCILE_TABLES) {
          for (const row of await store.all(table)) {
            const key = `${row.table}::${row.id}`;
            if (row.op !== 'delete' && !seen.has(key)) {
              await store.applyRemote([{ ...row, op: 'delete', syncTs: new Date().toISOString() }]);
              deletedLocally.push(key);
            }
          }
        }
        // 全量判定可能制造新墓碑 → 子引用随之收养
        await adoptOrphans();
      }
      return { applied, deletedLocally };
    },
  };
}
