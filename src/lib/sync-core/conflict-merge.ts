/**
 * G442 —— 五类数据各有**独立合并器**，且都是"可选增强"；合并后**逐槽回退服务端原值**。
 *
 * 官方那五支（`internals.md` §十一 3）：
 *   - 子块列表 `e$(client, server, base) → {mergedBlockIds}`；
 *   - 表格 `P0e(…, mergedBlockIds)`（★ **要吃刚合完的子块结果**；数据非法则整槽回退 `{}`）；
 *   - 记录 `D0e(…, objectListSchema)`（★ **要额外吃父 `objectList` 的当前 schema**，因字段定义
 *     本身可能同时被改）；
 *   - 表头 `E0e`；任务 `_0e → vVe`。
 *
 * 最终回退形如 `mergedBlockIds ?? b.subblocks`、`si(o.get(id)) ?? b.pluginData`——**合不出来就用
 * 服务端那版**，绝不写半个结果。本模块把"逐槽合并 + 回退"这套形状写成纯核。
 */

export interface SlotMergeInput<T> {
  /** 服务端那一版（回退用）。 */
  server: T;
  /** 本地那一版。 */
  local: T;
  /** 共同祖先；`undefined`＝基线未知（退化档）。 */
  base?: T;
  /** 合并器；返回 `null`／`undefined` 表示"合不出来"，走回退。 */
  merge: (local: T, server: T, base: T | undefined) => T | null | undefined;
}

/**
 * 一个槽的合并：合并器出结果就用它，出不来（`null`／`undefined`）就回退**服务端原值**。
 * 合并器抛异常也回退——官方那支对非法表格数据是 `logger().error(...)` 后整槽回退 `{}`，
 * 本地等价的语义是"不因为一个坏槽把整次同步弄挂"。
 */
export function mergeSlot<T>(input: SlotMergeInput<T>): T {
  try {
    const merged = input.merge(input.local, input.server, input.base);
    return merged === null || merged === undefined ? input.server : merged;
  } catch {
    return input.server;
  }
}

/** 子块列表合并器的输入：三个 blockIds 数组。 */
export interface BlockIdsMerge {
  local: string[];
  server: string[];
  base?: string[];
}

/**
 * 子块列表的合并：保留本地新增（不在 base 里的本地项）、保留服务端新增（不在 base 里的服务端项），
 * 顺序以**服务端序**为骨、把本地新增按本地序插到 base 尾部之后。基线未知时退化为"服务端为准，
 * 本地非空保留"——把本地独有项追加到服务端列表末尾。
 *
 * 返回 `{ mergedBlockIds }`，与官方那一支同名。
 */
export function mergeBlockIds(input: BlockIdsMerge): { mergedBlockIds: string[] } {
  const { local, server, base } = input;
  if (!base) {
    // 退化档：服务端为准，本地非空项追加在后（首次同步时服务端是权威，本地新写的不能丢）。
    const seen = new Set(server);
    return { mergedBlockIds: [...server, ...local.filter((id) => !seen.has(id))] };
  }
  const baseSet = new Set(base);
  const localAdded = local.filter((id) => !baseSet.has(id));
  const merged = [...server];
  const present = new Set(server);
  for (const id of localAdded) {
    if (!present.has(id)) {
      merged.push(id);
      present.add(id);
    }
  }
  return { mergedBlockIds: merged };
}

/** 记录（objectList 成员）合并器的输入。 */
export interface ObjectListMerge {
  local: Record<string, unknown>[];
  server: Record<string, unknown>[];
  base?: Record<string, unknown>[];
  /** 父 objectList 的**当前** schema（字段定义本身可能同时被改，官方那支要额外吃它）。 */
  schema: Record<string, unknown>;
}

/**
 * 记录列表的合并：按 id 归并，**schema 里没有的字段一律丢弃**（字段定义可能刚被改过）。
 * 同一 id 两边都改时以本地为准（本地是这台设备刚敲下的那一下）；本地没有的记录用服务端那版。
 */
export function mergeObjectList(input: ObjectListMerge): Record<string, unknown>[] {
  const allowed = new Set(Object.keys(input.schema ?? {}));
  const pick = (row: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      // `id` is the record's identity, not a schema field — it is never dropped by a schema change.
      if (key === 'id' || allowed.size === 0 || allowed.has(key)) out[key] = value;
    }
    return out;
  };
  const byId = new Map<string, Record<string, unknown>>();
  for (const row of input.server) {
    const id = String(row.id ?? '');
    if (id) byId.set(id, pick(row));
  }
  for (const row of input.local) {
    const id = String(row.id ?? '');
    if (id) byId.set(id, pick(row));
  }
  return [...byId.values()];
}

/** 表格合并器要吃刚合完的子块结果（官方那支的 `mergedBlockIds` 参数）。 */
export interface TableMerge {
  localRows: unknown[] | null;
  serverRows: unknown[] | null;
  baseRows?: unknown[] | null;
  mergedBlockIds: string[];
}

/**
 * 表格合并：数据非法（不是数组）⇒ 回退 `{}`（官方那句 `Invalid table data` 后的整槽回退）。
 * 合法时把两边的行按各自 `id` 合起来，再按 `mergedBlockIds`（刚合完的子块序）**重排**——
 * 行序跟着子块序走；不在 `mergedBlockIds` 里的行按原序附在后面。
 */
export function mergeTable(input: TableMerge): unknown {
  if (!Array.isArray(input.serverRows)) return {};
  if (!Array.isArray(input.localRows)) return input.serverRows;
  const byId = new Map<string, unknown>();
  for (const row of [...input.serverRows, ...input.localRows]) {
    const id = String((row as { id?: unknown })?.id ?? '');
    if (id) byId.set(id, row);
  }
  const ordered: unknown[] = [];
  const used = new Set<string>();
  for (const id of input.mergedBlockIds) {
    if (byId.has(id) && !used.has(id)) {
      ordered.push(byId.get(id));
      used.add(id);
    }
  }
  for (const [id, row] of byId) {
    if (!used.has(id)) ordered.push(row);
  }
  return ordered;
}
