/**
 * G1539（集合条目拖拽重排）的纯核：把"拖到哪、谁的 order 要改写"从 React 里摘出来，
 * 好让顺序语义有单测钉住——组件那边只剩事件绑定与写入。
 *
 * 与 `src/actions/collection/items.ts` 的 `updateItemOrder(itemId, newOrder)` 同一套语义：
 * `order` 是集合内的 0 基序号，读侧 `getCollection` 按 `order.asc()` 取行。
 */

export interface OrderedRow {
  id: string;
  order: number;
}

/** 把 `fromIndex` 处的元素搬到 `toIndex`（其余元素顺移），返回新数组；越界或原地不动返回原数组的拷贝。 */
export function moveRow<T>(rows: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...rows];
  if (fromIndex === toIndex) return next;
  if (fromIndex < 0 || fromIndex >= next.length) return next;
  if (toIndex < 0 || toIndex >= next.length) return next;
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** 重排后按位置重发 0 基序号（列表顺序即权威顺序）。 */
export function renumber<T extends OrderedRow>(rows: T[]): T[] {
  return rows.map((row, index) => (row.order === index ? row : { ...row, order: index }));
}

/**
 * 算出这次拖放真正需要写库的那几行——**只写 order 变了的**，避免为一次拖拽把整表都推一遍
 * （每行一次 applyLocal 就是一次入队＋广播）。
 */
export function orderPatches(before: OrderedRow[], after: OrderedRow[]): { id: string; order: number }[] {
  const beforeById = new Map(before.map((row) => [row.id, row.order]));
  return after
    .filter((row) => beforeById.get(row.id) !== row.order)
    .map((row) => ({ id: row.id, order: row.order }));
}

/**
 * 拖动生效的前置条件：视图带排序或分组时，屏上顺序由它们决定，`order` 改了也看不见
 * ⇒ 这种视图上不提供拖拽（宁可没有，也不要"拖了没反应"）。
 *
 * ☆ 筛选**不**在这个判据里：筛选只减少屏上行数，不改顺序的来源。但筛选下拖拽必须按
 *   **全集**重排（见 `planReorder`）——若拿筛选后的子集去 `renumber`，可见行会被压成
 *   0..k-1，与留在集合里的隐藏行撞号，清掉筛选后顺序就不再是用户拖出来的那个。
 */
export function canReorder(options: { sortCount: number; grouped: boolean }): boolean {
  return options.sortCount === 0 && !options.grouped;
}

/**
 * 一次拖放要写库的那几行——输入必须是**该集合的完整有序行集合**（屏上顺序即全集顺序，
 * 筛选只影响渲染，不参与序号分配）。`from`/`to` 是两行在全集里的下标，越界或原地不动返回空。
 */
export function planReorder(
  rows: OrderedRow[],
  sourceId: string,
  targetId: string,
): { id: string; order: number }[] {
  if (!sourceId || !targetId || sourceId === targetId) return [];
  const from = rows.findIndex((row) => row.id === sourceId);
  const to = rows.findIndex((row) => row.id === targetId);
  if (from < 0 || to < 0) return [];
  return orderPatches(rows, renumber(moveRow(rows, from, to)));
}
