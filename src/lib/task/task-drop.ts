/**
 * G270 —— 任务拖拽的落点是**半区判定而非最近中心**（`tasks.md`）。
 *
 * 官方那句：`insertAtIndex = side === "left" ? C : C + 1` ⇒ 落在某格**左半区**插到它之前、
 * **右半区**插到它之后。另有**三种情况主动抑制指示线**：① 悬在自身；② 目标位在被拖组内；
 * ③ 相邻位在被拖组内。本地任务视图此前无拖拽排序（用 `closestCenter`，也没有同组相邻抑制）。
 */

export type DropSide = 'left' | 'right';

/** 某格按半区算出的插入下标：左半区＝该格之前，右半区＝该格之后。 */
export function insertIndexFor(side: DropSide, targetIndex: number): number {
  return side === 'left' ? targetIndex : targetIndex + 1;
}

/**
 * 指针落在某格的哪半区。**以格中线为界**，中线本身归右（与 `insertAtIndex` 的 `C+1` 一致）。
 */
export function sideFor(pointerX: number, rect: { left: number; right: number }): DropSide {
  const mid = (rect.left + rect.right) / 2;
  return pointerX <= mid ? 'left' : 'right';
}

export interface DragContext {
  /** 被拖项的 id。 */
  draggingId: string;
  /** 当前悬停的目标格 id。 */
  targetId: string;
  /** 与被拖项同组（同一序列/同一分组）的 id 集合。 */
  draggedGroup: readonly string[];
  /** 目标格的相邻格 id（左邻与右邻，缺则为 null）。 */
  targetNeighbors: readonly (string | null)[];
}

/**
 * 该不该**抑制指示线**（不显示落点）。三种情况任一成立即抑制：
 * ① 悬在自身；② 目标位在被拖组内；③ 相邻位在被拖组内。
 *
 * 抑制的意义：在组内拖拽时，落点会落在自己那一组里，指示线若照画，用户会以为能插进组中间。
 */
export function shouldSuppressIndicator(ctx: DragContext): boolean {
  if (ctx.draggingId === ctx.targetId) return true;
  const group = new Set(ctx.draggedGroup);
  if (group.has(ctx.targetId)) return true;
  return ctx.targetNeighbors.some((neighbor) => neighbor !== null && group.has(neighbor));
}
