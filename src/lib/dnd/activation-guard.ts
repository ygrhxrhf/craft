/**
 * The drag activation guard (G269). Officially a press that lands on a form control or a link
 * never starts a drag — the click belongs to the control, not to the drag. The general selector is
 * `input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]),
 * a[href]`; the board variant adds `[data-object-id]` on top and also checks for elements inside
 * `[data-kanban-card-list]`.
 *
 * The `:not([disabled])` half matters: a disabled control is inert, so pressing it is not a click
 * the drag has to yield to, and the row stays draggable by that spot.
 */

/** The general exclusion selector, verbatim. */
export const DRAG_EXCLUSION_SELECTOR =
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]';

/** The board's extra exclusions, verbatim. */
export const BOARD_DRAG_EXCLUSION_SELECTOR = `${DRAG_EXCLUSION_SELECTOR}, [data-object-id]`;

/** The board's card-list container — a press inside it is handled by the list, not the board. */
export const BOARD_CARD_LIST_SELECTOR = '[data-kanban-card-list]';

/**
 * Whether a press on `target` must be left to the control rather than starting a drag.
 *
 * `variant` picks the selector set: the general one, or the board's, which adds the object id and
 * the card-list container. A `null` target (a synthetic event) is not a control, so a drag may
 * start — the guard only ever subtracts draggable area it can actually see.
 *
 * `root` is the element carrying the drag handlers. It matters because a sidebar row *is* a
 * `<button>`: the selector matches the row itself, so without the `hit !== root` guard the whole
 * row would stop dragging. The official exclusion is for controls *inside* the draggable element,
 * which is what `root.contains(hit)` states.
 */
export function pressStartsDrag(
  target: Element | null,
  variant: 'general' | 'board' = 'general',
  root?: Element | null,
): boolean {
  if (!target) return true;
  const selector = variant === 'board' ? BOARD_DRAG_EXCLUSION_SELECTOR : DRAG_EXCLUSION_SELECTOR;
  const hit = target.closest(selector);
  if (hit && hit !== root) return false;
  if (variant === 'board') {
    const cardList = target.closest(BOARD_CARD_LIST_SELECTOR);
    if (cardList && cardList !== root) return false;
  }
  return true;
}
