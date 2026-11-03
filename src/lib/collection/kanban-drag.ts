/**
 * G268 / 看板拖拽：官方看板卡片**一律长按 150ms** 才起拖（不分设备），松手落在哪一列就把
 * 该行的分组值改成那一列；移动超过 8px 视为滚动而非长按。
 */
import { DRAG_THRESHOLDS } from '@/lib/dnd/drag-threshold';

export const BOARD_LONG_PRESS_MS = DRAG_THRESHOLDS.board.touchDelay;
export const BOARD_MOVE_TOLERANCE = 8;

export function boardHoldCancelled(dx: number, dy: number, tolerance = BOARD_MOVE_TOLERANCE): boolean {
  return Math.hypot(dx, dy) > tolerance;
}

/** 指针落点所在列的 id（`data-kanban-column`）；不在任何列上回 `null`。 */
export function dropColumnAt(element: Element | null): string | null {
  const column = element?.closest?.('[data-kanban-column]') ?? null;
  return column?.getAttribute('data-kanban-column') ?? null;
}
