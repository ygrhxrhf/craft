/**
 * G1555/G1135: the browse screens support **drag marquee** selection. The geometry is two layers:
 * a strict rectangle-intersection hit test, and a start threshold so a click never becomes a drag.
 *
 * The official rubber band is a fixed-position overlay with `pointer-events: none`; the hit test
 * runs on the item rects captured when the drag starts.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ItemRect extends Rect {
  id: string;
}

/** The drag has to travel this far before it counts as a marquee rather than a click. */
export const MARQUEE_START_THRESHOLD = 5;

export function rectFromPoints(ax: number, ay: number, bx: number, by: number): Rect {
  return {
    left: Math.min(ax, bx),
    top: Math.min(ay, by),
    width: Math.abs(ax - bx),
    height: Math.abs(ay - by),
  };
}

/** Whether a marquee drag has travelled far enough to be one. */
export function isMarqueeDrag(start: { x: number; y: number }, current: { x: number; y: number }): boolean {
  return (
    Math.abs(current.x - start.x) >= MARQUEE_START_THRESHOLD ||
    Math.abs(current.y - start.y) >= MARQUEE_START_THRESHOLD
  );
}

/**
 * Strict rectangle intersection: touching edges do not count, which is what keeps a marquee that
 * just grazes a card from selecting it.
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height &&
    b.top < a.top + a.height
  );
}

/** The ids a marquee covers, in the order the items were given. */
export function marqueeHits(band: Rect, items: readonly ItemRect[]): string[] {
  return items.filter((item) => rectsIntersect(band, item)).map((item) => item.id);
}
