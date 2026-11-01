/**
 * G1384: the theme is written onto `<html>` by a runtime effect — there is no first-paint inline
 * script. The official effect writes four attributes at once and hangs a `no-transitions` class
 * first so the colour swap cannot be animated into a visible flash:
 *
 *   classList.add('no-transitions')
 *   dataset.theme = scheme
 *   dataset.accent = accent
 *   dataset.pointer = 'fine' | 'coarse'
 *   dataset.scrollbar = 'persistent' | (deleted)
 *
 * Locally the colour scheme is next-themes' class and the accent is applied separately; this
 * module covers the two input-media axes and the transition guard, so the same four facts exist
 * on the element and CSS can key on them.
 */

export type PointerAxis = 'fine' | 'coarse';

export function pointerAxisOf(matchesCoarse: boolean): PointerAxis {
  return matchesCoarse ? 'coarse' : 'fine';
}

/** The scrollbar axis is written only when persistent; otherwise the attribute is removed. */
export function scrollbarAxisOf(persistent: boolean): 'persistent' | null {
  return persistent ? 'persistent' : null;
}

export interface ThemeAxes {
  pointer: PointerAxis;
  scrollbar: 'persistent' | null;
}

/** The axes derived from the two media queries the official effect reads. */
export function themeAxes(env: { coarsePointer: boolean; persistentScrollbar: boolean }): ThemeAxes {
  return {
    pointer: pointerAxisOf(env.coarsePointer),
    scrollbar: scrollbarAxisOf(env.persistentScrollbar),
  };
}

/**
 * Apply the axes to an element, deleting the scrollbar attribute when it is off rather than
 * writing a falsy value — the official `delete` branch, which is what the CSS reads.
 */
export function applyThemeAxes(element: HTMLElement, axes: ThemeAxes): void {
  element.dataset.pointer = axes.pointer;
  if (axes.scrollbar) element.dataset.scrollbar = axes.scrollbar;
  else delete element.dataset.scrollbar;
}
