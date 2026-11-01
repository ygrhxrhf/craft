/**
 * G590 —— 表格落点的**构造期钳制**接真实插入路径。
 *
 * 官方那四族（`model.md` §一之三十二）：`aboveTableRowLocation{tableId,row,maxRow}` /
 * `belowTableRowLocation{…}` / `afterTableColumnLocation{tableId,column,maxCol}` /
 * `beforeTableColumnLocation{…}` —— 每个都**在构造时带 `maxRow`/`maxCol`**，越界的行/列在
 * 解析期就夹回界内，而不是到运行期再校验。
 *
 * `drop-address.ts` 已给出解析（`resolveDropAddress` 返回 `tableCell` 落点）；本模块把那四族
 * 折算成**表格工具栏的真实插入动作**：给出该插哪一行/哪一列。
 */

import type { DropAddress, DropLanding } from './drop-address';
import { resolveDropAddress, type AddressRow } from './drop-address';

export type TableInsertAxis = 'row' | 'column';
export type TableInsertSide = 'before' | 'after';

export interface TableInsertPlan {
  axis: TableInsertAxis;
  side: TableInsertSide;
  /** 已钳制到界内的行/列下标。 */
  index: number;
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.trunc(value)), max);
}

/**
 * 把官方四族表格落点折算成一次插入：上/下 → 行（before/after），左/右 → 列（before/after）。
 * `maxRow`/`maxCol` 是构造期就带上的上界，这里再夹一遍（与 `resolveDropAddress` 同口径）。
 */
export function planTableInsert(address: DropAddress): TableInsertPlan | null {
  switch (address.kind) {
    case 'aboveTableRow':
      return { axis: 'row', side: 'before', index: clamp(address.row, address.maxRow) };
    case 'belowTableRow':
      return { axis: 'row', side: 'after', index: clamp(address.row, address.maxRow) };
    case 'beforeTableColumn':
      return { axis: 'column', side: 'before', index: clamp(address.column, address.maxCol) };
    case 'afterTableColumn':
      return { axis: 'column', side: 'after', index: clamp(address.column, address.maxCol) };
    default:
      return null;
  }
}

/**
 * 从一份落点地址解析出**表格单元格落点**（`tableCell`），并据此给插入计划。
 * 地址解析不出来（表不在行集合里）⇒ `null`，调用方不插（宁可不动，也不猜一个位置）。
 */
export function planTableInsertAt(address: DropAddress, rows: AddressRow[]): TableInsertPlan | null {
  const landing: DropLanding | null = resolveDropAddress(address, rows);
  if (!landing || landing.at !== 'tableCell') return null;
  return planTableInsert(address);
}
