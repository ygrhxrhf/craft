/**
 * G594/G608 —— 官方 action 分派不是一张表而是 **60 张**（`model.md` §一之三十三），且
 * `HJe` 是**批量变更归一应用器**：`for (const o of e) { const s = {...t, ...n}; n = {...n, ...apply(s, o.change)} }`
 * ⇒ 一串 change 在「基态 + 已合并补丁」的快照上**按序逐条应用、最后一次性返回合并结果**。
 *
 * 本地无 action 协议层（写侧 server action 直改 Prisma、读侧 React state），也没有批量归一。
 * 本模块把这两件事的**形状**写出来：分派表的注册/查找，与"按序快照重放"的批量归一。
 */

/** 一张分派表：id → 处理函数。官方按 store 分成 60 张，这里是那一张的抽象。 */
export interface DispatchTable<S, A> {
  /** 表名（对应官方那个 store，如 `document` / `ui-selection` / `shell`）。 */
  name: string;
  handlers: Map<string, (state: S, action: A) => S>;
}

export function createDispatchTable<S, A>(name: string): DispatchTable<S, A> {
  return { name, handlers: new Map() };
}

export function register<S, A>(table: DispatchTable<S, A>, id: string, handler: (state: S, action: A) => S): void {
  table.handlers.set(id, handler);
}

/**
 * 分派：**有没有这个 id 决定它是分派器还是映射表**（官方那条 `default:He` 判据的本地形态）。
 * 命中 ⇒ 返回新状态；未命中 ⇒ `null`（调用方据此决定报错还是回退，不静默吞掉）。
 */
export function dispatch<S, A>(
  table: DispatchTable<S, A>,
  state: S,
  action: { type: string } & A,
): S | null {
  const handler = table.handlers.get(action.type);
  return handler ? handler(state, action) : null;
}

/** 一组分派表（官方那 60 张）。 */
export interface DispatchRegistry<S, A> {
  tables: DispatchTable<S, A>[];
}

export function createRegistry<S, A>(): DispatchRegistry<S, A> {
  return { tables: [] };
}

export function addTable<S, A>(registry: DispatchRegistry<S, A>, table: DispatchTable<S, A>): void {
  registry.tables.push(table);
}

/** 按表名找一张表。 */
export function tableByName<S, A>(registry: DispatchRegistry<S, A>, name: string): DispatchTable<S, A> | null {
  return registry.tables.find((table) => table.name === name) ?? null;
}

/**
 * G608：批量归一应用器（官方 `HJe`）。一串 change 在「基态 + 已合并补丁」的快照上按序逐条应用，
 * **每次都在上一步结果之上再合并**，最后一次性返回。返回 `null` 表示某条 change 无人认领
 * （不静默跳过——静默跳过正是"部分应用"的来源）。
 */
export interface Change {
  type: string;
}

export function applyChanges<S, A extends Change>(
  base: S,
  changes: A[],
  apply: (state: S, change: A) => S | null,
): { state: S; applied: number } | null {
  let state = base;
  let applied = 0;
  for (const change of changes) {
    const next = apply(state, change);
    if (next === null) return null;
    state = next;
    applied += 1;
  }
  return { state, applied };
}
