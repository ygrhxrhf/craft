/**
 * G440/G441/G442 —— 把冲突三件套（判据／基线／逐槽合并）接上真实消费点。
 *
 * 此前三个纯核各自成立，却都停在"没有调用点"：本地写库是整行 LWW，pull 把服务端行原样盖回
 * 本地镜像。真实语义缺的正是官方那一层——**同一条记录既有未上报的本地改动、服务端又来了新补丁
 * 时，不是"谁新谁赢"，而是三方合并**（本地／服务端／共同祖先），合不出来才回退服务端原值。
 *
 * 这里的共同祖先取自**本地镜像在应用这条服务端记录之前的值**：它就是这台设备上次与服务端对齐
 * 后的那份（官方那四个快照字典在本地对应的最小形态）。判据走 `decideConflict`（索引比较），
 * 逐槽走 `mergeSlot`，任务槽走 `mergeTaskData`，集合条目槽走 `mergeObjectList`。
 */

import { decideConflict } from './conflict-criterion';
import { normalizeBase, oldValueOf, type BaseSnapshotKey, type ConflictBase } from './conflict-base';
import { mergeBlockIds, mergeSlot, mergeTaskData } from './conflict-merge';
import type { PendingOp, SyncRecord } from './types';

/** 合并只读这几样，用它自己的形状而不是整个 PendingOp（调用方不必凑 seq/tries）。 */
export type PendingIntentLike = Pick<PendingOp, 'table' | 'recordId' | 'op' | 'payload'>;

/** 表 → 基线里对应的快照字典（官方那四个；未列出的表落在 `docIdTree` 上）。 */
const BASE_KEY_BY_TABLE: Record<string, BaseSnapshotKey> = {
  task: 'oldTaskData',
  collection_item: 'oldObjectData',
  collection: 'oldObjectData',
  collection_property: 'oldPluginData',
  collection_view: 'oldPluginData',
  comment_thread: 'oldPluginData',
};

function baseKeyFor(table: string): BaseSnapshotKey {
  return BASE_KEY_BY_TABLE[table] ?? 'docIdTree';
}

/**
 * G441 —— 把本地镜像那一份折成官方的基线形状：**这台设备上次与服务端对齐后的值**就是共同祖先。
 * 官方那份基线由服务端随补丁下发；本地对应物是本地镜像（它记录的就是对齐后的值），
 * 于是不必另存历史版本即可构造三方合并。走 `normalizeBase` 归一（缺 token 补 `"init"`）。
 */
function baseFromMirror(table: string, mirror: SyncRecord | null): ConflictBase {
  if (!mirror?.data) return normalizeBase(null);
  return normalizeBase({
    syncToken: mirror.syncTs,
    snapshot: { [baseKeyFor(table)]: { [mirror.id]: mirror.data } } as never,
  });
}

/** 从基线里读某一格的旧值；`known:false`＝服务端没告诉过旧样子（退化档，当"本地没改"）。 */
function baseField(base: ConflictBase, table: string, id: string, key: string): { known: boolean; value: unknown } {
  const snapshot = base.snapshot?.[baseKeyFor(table)] ?? {};
  const entry = snapshot[id];
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    const record = entry as Record<string, unknown>;
    return Object.prototype.hasOwnProperty.call(record, key)
      ? { known: true, value: record[key] }
      : { known: false, value: undefined };
  }
  return oldValueOf(base, baseKeyFor(table), id);
}

export interface ConflictResolveInput {
  table: string;
  id: string;
  /** 服务端这次下发的记录。 */
  server: SyncRecord;
  /** 应用之前本地镜像里那一份＝共同祖先；`null`＝本地没有（首次见到）。 */
  localMirror: SyncRecord | null;
  /** 本机同一条记录未上报的意图；`null`＝没有未上报改动。 */
  pending: PendingIntentLike | null;
}

export type ConflictResolveResult =
  | { decision: 'adopt' }
  | { decision: 'merge'; data: Record<string, unknown> };

/** `syncTs` → 毫秒索引；解析不出时退化为 0（当作"最旧"，不拦合并）。 */
function indexOf(ts: string | null | undefined): number {
  if (typeof ts !== 'string' || !ts) return 0;
  const at = Date.parse(ts);
  return Number.isNaN(at) ? 0 : at;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 深比较只服务"这一格本地到底改没改"，JSON 串相等足够（值都是 JSON 形状）。 */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * 逐字段三方合并：**只有一侧改了这一格**时以改动的那侧为准；**两侧都改**时服务端胜出
 * （与官方"合不出来就回退服务端"同一姿态）。`id` 是身份，永远取服务端。
 * 祖先那一格由 `baseField` 从基线里取（`known:false` ⇒ 服务端没说过旧样子 ⇒ 当作"本地没改"）。
 */
function mergeFields(
  table: string,
  id: string,
  base: ConflictBase,
  server: Record<string, unknown>,
  local: Record<string, unknown>,
): Record<string, unknown> {
  const keys = new Set([...Object.keys(server), ...Object.keys(local)]);
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (key === 'id') {
      out[key] = server[key];
      continue;
    }
    const s = server[key];
    const l = local[key];
    const ancestor = baseField(base, table, id, key);
    const b = ancestor.known ? ancestor.value : l; // 基线未知 ⇒ 当作"本地没改过这一格"
    out[key] = mergeSlot({
      server: s,
      local: l,
      base: b,
      merge: (lv, sv, bv) => {
        const localChanged = !sameValue(lv, bv);
        const serverChanged = !sameValue(sv, bv);
        if (localChanged && !serverChanged) return lv;
        return sv;
      },
    });
  }
  return out;
}

/**
 * 集合条目槽：`schemas` 是**归属 id 数组**（G427/G428：一个对象可同属多个集合），
 * 两侧各自新增的归属都保留（按 id 并集、服务端序为骨）。其余字段仍走逐字段三方。
 */
function mergeCollectionItem(
  table: string,
  id: string,
  base: ConflictBase,
  server: Record<string, unknown>,
  local: Record<string, unknown>,
): Record<string, unknown> {
  const merged = mergeFields(table, id, base, server, local);
  const asIds = (v: unknown): string[] | null =>
    Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : null;
  const localSchemas = asIds(local.schemas);
  const serverSchemas = asIds(server.schemas);
  if (localSchemas || serverSchemas) {
    const ancestor = baseField(base, table, id, 'schemas');
    merged.schemas = mergeBlockIds({
      local: localSchemas ?? [],
      server: serverSchemas ?? [],
      base: ancestor.known ? asIds(ancestor.value) ?? undefined : undefined,
    }).mergedBlockIds;
  }
  return merged;
}

/**
 * 该不该合、合出来是什么。返回 `adopt` 表示"按服务端为准"（没有未上报改动、服务端不落后、
 * 或墓碑那一笔——墓碑的语义是"从此刻起不存在"，不跟内容做三方合并）。
 */
export function resolveConflict(input: ConflictResolveInput): ConflictResolveResult {
  const { pending, server } = input;
  // 没有未上报的本地改动 ⇒ 没什么可合的，服务端就是唯一真源。
  if (!pending) return { decision: 'adopt' };
  // 墓碑不参与逐槽合并：删除是"从此刻起不存在"，两边内容拼起来没有意义。
  if (server.op === 'delete' || pending.op === 'delete') return { decision: 'adopt' };

  // G440：官方那句 `blocks.length > 0 && localSyncIndex > lastSyncPatchIndex`。
  // 本地对应：有未上报改动（localBlocks=1）且**本地那笔的时间戳比服务端这版新**（服务端落后）。
  const decision = decideConflict({
    localBlocks: 1,
    localSyncIndex: indexOf(pending.payload.syncTs),
    lastSyncPatchIndex: indexOf(server.syncTs),
  });
  if (decision === 'adopt') return { decision: 'adopt' };

  const serverData = server.data ?? {};
  const localData = pending.payload.data ?? {};
  // G441：共同祖先由本地镜像折成官方基线形状（这台设备上次与服务端对齐后的值）。
  const base = baseFromMirror(input.table, input.localMirror);

  // 任务槽走官方那支 `_0e → vVe`（任一侧是任务就要合，逐字段、本地为最新）。
  if (input.table === 'task') {
    const ancestor = baseField(base, input.table, input.id, 'taskData');
    const merged = mergeTaskData({
      local: localData,
      server: serverData,
      base: ancestor.known && isPlainObject(ancestor.value) ? ancestor.value : null,
    });
    return { decision: 'merge', data: merged ?? serverData };
  }
  // 集合条目槽走 `D0e`（记录表按 id 归并 + schema 裁剪）。
  if (input.table === 'collection_item') {
    return { decision: 'merge', data: mergeCollectionItem(input.table, input.id, base, serverData, localData) };
  }
  // 其余表：逐字段三方（只有一侧改动的那格保留，两侧都改服务端胜出）。
  return { decision: 'merge', data: mergeFields(input.table, input.id, base, serverData, localData) };
}
