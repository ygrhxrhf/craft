/**
 * G441 —— 冲突合并的**基线由服务端随补丁下发**，不是客户端存历史版本。
 *
 * 官方那四个以 `syncToken` 为键的快照字典（`internals.md` §十一 2）：
 * `{ docIdTree, oldPluginData, oldObjectData, oldTaskData }`。基线 token 缺省用字面量 `"init"`；
 * 首次同步时四个字典都空 ⇒ 三方合并**退化为「服务端为准 + 本地非空保留」**。
 *
 * 本地写库协议此前没有"旧值"这一层（`Document.updatedAt` 单值）⇒ 结构上做不了三方合并。
 * 本模块把那四个字典的形状与退化规则单独写出来：它是协议面的一枚纯核，不依赖 store，
 * 于是"首次同步该怎么合"能被单测钉死，而不必先搬动整个写库协议。
 */

/** 基线 token 的缺省字面量。 */
export const INITIAL_SYNC_TOKEN = 'init';

/** 四个快照字典的键名（官方那四个）。 */
export const BASE_SNAPSHOT_KEYS = ['docIdTree', 'oldPluginData', 'oldObjectData', 'oldTaskData'] as const;

export type BaseSnapshotKey = (typeof BASE_SNAPSHOT_KEYS)[number];

/** 一份基线：四个以 id 为键的字典。 */
export type BaseSnapshot = Record<BaseSnapshotKey, Record<string, unknown>>;

export interface ConflictBase {
  /** 这份基线对应的 token；缺省 `"init"`。 */
  syncToken: string;
  /** 四个快照字典；`null`＝服务端没随这次补丁下发基线。 */
  snapshot: BaseSnapshot | null;
}

/** 一份空基线（首次同步那一档）。 */
export function emptyBaseSnapshot(): BaseSnapshot {
  return { docIdTree: {}, oldPluginData: {}, oldObjectData: {}, oldTaskData: {} };
}

/**
 * 归一一份来自服务端的基线：缺 token 补 `"init"`，缺字典补空字典。
 * 一份 `snapshot: null` 的基线（服务端没下发）归一成**空基线**——这就是首次同步的形态。
 */
export function normalizeBase(input: Partial<ConflictBase> | null | undefined): ConflictBase {
  const syncToken = typeof input?.syncToken === 'string' && input.syncToken ? input.syncToken : INITIAL_SYNC_TOKEN;
  const raw = input?.snapshot;
  if (!raw) return { syncToken, snapshot: emptyBaseSnapshot() };
  const snapshot = emptyBaseSnapshot();
  for (const key of BASE_SNAPSHOT_KEYS) {
    const dict = raw[key];
    if (dict && typeof dict === 'object') snapshot[key] = { ...(dict as Record<string, unknown>) };
  }
  return { syncToken, snapshot };
}

/** 这份基线是不是"首次同步"那一档（四个字典全空 ⇒ 合并要退化为服务端为准）。 */
export function isDegenerateBase(base: ConflictBase): boolean {
  const snapshot = base.snapshot;
  if (!snapshot) return true;
  return BASE_SNAPSHOT_KEYS.every((key) => Object.keys(snapshot[key] ?? {}).length === 0);
}

/**
 * 从一份基线里取某个键的旧值。**基线里没有这个键**（`undefined`）与**旧值就是 `undefined`**
 * 是两回事：前者说明"服务端没告诉过我它的旧样子"（退化档），后者是"旧值确实是空的"。
 * 用 `hasOwnProperty` 分开，是这套判定能成立的前提。
 */
export function oldValueOf(base: ConflictBase, key: BaseSnapshotKey, id: string): { known: boolean; value: unknown } {
  const dict = base.snapshot?.[key] ?? {};
  return Object.prototype.hasOwnProperty.call(dict, id) ? { known: true, value: dict[id] } : { known: false, value: undefined };
}
