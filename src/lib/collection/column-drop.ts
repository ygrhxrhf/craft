/**
 * G397 —— 列拖拽的落点是**独立于块寻址的第二套协议**（`model.md` §一之七 4）：
 * `EMe(t, e, n) = { type: "afterTableColumnLocation", tableId, column, maxCol }`。
 * 块那一边走 `afterAnchor` / `indexInParent` 一族（G590），列这一族只在集合表头出现；
 * ★ `maxCol` 是**构造期常数**（G590 同记「表格落点构造时即带 maxRow/maxCol 钳制」），
 * 不是落地时才补算出来的。
 *
 * 语义只有「插到某一列之后」。要落到第一列左边（before）得用 `beforeTableColumnLocation`
 * 那一族，那是 G590 的行 ⇒ 本模块给不出落点就是给不出，不偷换。
 */

/** 与块拖拽（`sidebar-drag` 的 MIME）分开的载荷类型。 */
export const COLUMN_DROP_MIME = 'application/x-crafty-collection-column';

/**
 * 起拖那一侧写、落点那一侧读的内存载荷。
 * `dataTransfer` 在 `dragover` 阶段读不到（官方的落点协议同样得先知道"在拖什么"），
 * 而 React state 要等一轮渲染才可见 ⇒ 与侧栏拖拽同一口径：留一份模块级载荷。
 */
export const columnDragState: { payload: { tableId: string; column: string } | null } = {
  payload: null,
};

export interface AfterTableColumnLocation {
  type: 'afterTableColumnLocation';
  /** 本张表的身份。本地"一张表"＝一个视图的一次渲染，列序也按视图存，所以取视图 id。 */
  tableId: string;
  /** 落点所在的列下标（0 基）。 */
  column: number;
  /** 构造期写进对象的列数上限。 */
  maxCol: number;
}

/** 构造落点：`column` 在构造期就被 `maxCol` 钳进 `[0, maxCol-1]`，空表给不出合法落点。 */
export function afterTableColumnLocation(args: {
  tableId: string;
  column: number;
  maxCol: number;
}): AfterTableColumnLocation | null {
  const maxCol = Math.max(0, Math.floor(args.maxCol));
  if (maxCol === 0) return null;
  const column = Math.min(maxCol - 1, Math.max(0, Math.floor(args.column)));
  return { type: 'afterTableColumnLocation', tableId: args.tableId, column, maxCol };
}

/**
 * 屏上某列的左右两半各对应一个落点：右半＝落在它之后，左半＝落在前一列之后。
 * 第一列左边没有「after」语义 ⇒ 返回 `null`（要那得用 before 族，另一行的事）。
 */
export function columnLocationAt(args: {
  tableId: string;
  visibleIds: readonly string[];
  index: number;
  side: 'before' | 'after';
}): AfterTableColumnLocation | null {
  const { visibleIds, index, side } = args;
  if (index < 0 || index >= visibleIds.length) return null;
  const column = side === 'after' ? index : index - 1;
  if (column < 0) return null;
  return afterTableColumnLocation({ tableId: args.tableId, column, maxCol: visibleIds.length });
}

/** 落点生效后的新列序：把被拖的那枚插到目标列之后，其余保持相对次序。 */
export function columnOrderAfterLocation(
  visibleIds: readonly string[],
  draggedId: string,
  location: AfterTableColumnLocation,
): string[] {
  const order = [...visibleIds];
  const from = order.indexOf(draggedId);
  const target = order[location.column];
  if (from < 0 || target === undefined || target === draggedId) return order;
  order.splice(from, 1);
  order.splice(order.indexOf(target) + 1, 0, draggedId);
  return order;
}
