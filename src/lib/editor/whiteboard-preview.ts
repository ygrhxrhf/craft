/**
 * G448: the whiteboard embed inside a document is a **static exported image**, not a second live
 * editor. Three states, fixed export parameters, and four gates that decide when a redraw is
 * allowed — switching back to the tab owes exactly one redraw, and a resize is debounced.
 */

export type PreviewState = 'loading' | 'ready' | 'error';

export const EXPORT_PADDING = 32;
export const EXPORT_BACKGROUND = false;

/** The board is scaled to fit, keeping its aspect ratio. */
export function containScale(board: { width: number; height: number }, box: { width: number; height: number }): number {
  if (board.width <= 0 || board.height <= 0 || box.width <= 0 || box.height <= 0) return 0;
  return Math.min(box.width / board.width, box.height / board.height);
}

export interface RedrawGates {
  /** The tab is visible (a hidden tab must not redraw). */
  tabVisible: boolean;
  /** No block is currently in edit mode. */
  noBlockEditing: boolean;
  /** The board data has loaded. */
  dataReady: boolean;
  /** The container size is known. */
  sizeKnown: boolean;
}

/** All four gates must be open before a redraw runs. */
export function canRedraw(gates: RedrawGates): boolean {
  return gates.tabVisible && gates.noBlockEditing && gates.dataReady && gates.sizeKnown;
}

export const RESIZE_DEBOUNCE_MS = 300;

/**
 * The redraw plan for a visibility change: becoming visible while the data is ready and nothing is
 * being edited owes one redraw (the "catch up after the tab comes back" rule).
 */
export function redrawOnVisibilityChange(
  becameVisible: boolean,
  gates: Omit<RedrawGates, 'tabVisible'>,
): boolean {
  return becameVisible && canRedraw({ ...gates, tabVisible: true });
}
