/**
 * G1555/G1135: the browse screens support **drag marquee** selection. The geometry is two layers:
 * a strict rectangle-intersection hit test, and a start threshold so a click never becomes a drag.
 *
 * The official rubber band is a fixed-position overlay with `pointer-events: none`.
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

/**
 * G1135 ①: a press that lands on any of these never starts a marquee — the surface belongs to
 * something else (a card, a link, a control, a text field). Verbatim from the official build.
 */
export const MARQUEE_IGNORE_SELECTOR =
  "[data-item-id], a, button, input, textarea, select, [contenteditable='true']";

/** Whether the pointer-down target hands the gesture to something that is not the marquee. */
export function isMarqueeVetoTarget(target: Element | null): boolean {
  return target?.closest(MARQUEE_IGNORE_SELECTOR) != null;
}

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

/**
 * G1135 ④: the official build compares the new hit set with the current one and skips the state
 * write when they are equal (`TVt`), so a drag that stays inside the same cards does not re-render.
 */
export function sameIdSet(current: ReadonlySet<string>, next: readonly string[]): boolean {
  if (current.size !== next.length) return false;
  return next.every((id) => current.has(id));
}

/**
 * G1135 ③: dragging past an edge of the scroll viewport auto-scrolls it. The official curve is
 * `±30 * min(distance / 200, 1) ** 1.5` px per frame — so it ramps in gently and caps at 30.
 */
export const AUTO_SCROLL_MAX_SPEED = 30;
export const AUTO_SCROLL_EDGE = 200;

export function autoScrollVelocity(pointerY: number, viewportTop: number, viewportBottom: number): number {
  const distance = pointerY < viewportTop ? viewportTop - pointerY : pointerY - viewportBottom;
  if (distance <= 0) return 0;
  const speed = AUTO_SCROLL_MAX_SPEED * Math.pow(Math.min(distance / AUTO_SCROLL_EDGE, 1), 1.5);
  return pointerY < viewportTop ? -speed : speed;
}
