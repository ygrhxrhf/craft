/**
 * The drag activation thresholds (G268). The official build ships **three** configurations, not one
 * global value, so the same product starts a drag at different moments depending on where you grab:
 *
 * | config     | pointer            | touch                      | used by                |
 * |------------|--------------------|----------------------------|------------------------|
 * | `general`  | move 8px           | hold 150ms (tolerance 5ms) | the main drag path     |
 * | `handle`   | none — press drags | none — press drags         | the more eager handles |
 * | `board`    | hold 150ms         | hold 150ms                 | board cards            |
 *
 * The tolerance is part of the reading: a touch that drifts up to 5ms past the hold still counts,
 * which is why it is carried here rather than folded into a single number.
 */

export type DragActivationConfig = 'general' | 'handle' | 'board';

export interface DragThreshold {
  /** Pointer devices: pixels of movement before the drag arms; 0 means "press drags at once". */
  pointerDistance: number;
  /** Touch devices: milliseconds of hold before the drag arms; 0 means "press drags at once". */
  touchDelay: number;
  /** Milliseconds of slack on the hold. */
  touchTolerance: number;
}

/** The three configurations, verbatim from `ui-affordances.md` §7.1. */
export const DRAG_THRESHOLDS: Record<DragActivationConfig, DragThreshold> = {
  general: { pointerDistance: 8, touchDelay: 150, touchTolerance: 5 },
  handle: { pointerDistance: 0, touchDelay: 0, touchTolerance: 0 },
  board: { pointerDistance: 0, touchDelay: 150, touchTolerance: 5 },
};

/** Whether the pointer is a touch pointer, which is what picks the column of the table. */
export function isTouchPointer(pointerType: string | undefined | null): boolean {
  return pointerType === 'touch' || pointerType === 'pen';
}

/**
 * How far (in px) the pointer must move before a drag arms under `config`.
 *
 * A touch device is governed by the hold, not by movement, so it reads as `Infinity`: no amount of
 * drifting arms the drag — the timer does. The exception is a config with no hold either (the eager
 * handle), which has no gate on any device and so reads 0.
 */
export function pointerArmDistance(
  config: DragActivationConfig,
  pointerType?: string | null,
): number {
  const threshold = DRAG_THRESHOLDS[config];
  if (isTouchPointer(pointerType)) return threshold.touchDelay === 0 ? 0 : Number.POSITIVE_INFINITY;
  return threshold.pointerDistance;
}

/**
 * How long (in ms) a touch must be held before a drag arms under `config`.
 *
 * Returns 0 when the config does not wait — either because it is the eager handle (both columns 0)
 * or because a pointer device is driving it, where movement is the gate instead.
 */
export function touchArmDelay(
  config: DragActivationConfig,
  pointerType?: string | null,
): number {
  if (!isTouchPointer(pointerType)) return 0;
  return DRAG_THRESHOLDS[config].touchDelay;
}

/** Whether the threshold arms on press with no wait at all. */
export function armsOnPress(config: DragActivationConfig, pointerType?: string | null): boolean {
  return pointerArmDistance(config, pointerType) === 0 && touchArmDelay(config, pointerType) === 0;
}
