/**
 * Block indentation (G218). Indentation is carried by a CSS variable on the block, one level per
 * 28px, and the variable is omitted entirely at level 0 — so a block with no indent has no
 * `--indent-w` at all rather than `0px`. That distinction is what the ledger records when it says
 * the property "disappears" at zero.
 */

export const INDENT_STEP_PX = 28;
export const INDENT_VARIABLE = '--indent-w';

/** The indent width for a level, in px. Level 0 is 0px, which is why it is omitted. */
export function indentWidth(level: number): number {
  return Math.max(0, Math.trunc(level)) * INDENT_STEP_PX;
}

/**
 * The inline style a block carries. Level 0 produces `{}` — no property at all — so the CSS
 * fallback applies rather than an explicit zero.
 */
export function indentStyle(level: number): Record<string, string> {
  const width = indentWidth(level);
  return width === 0 ? {} : { [INDENT_VARIABLE]: `${width}px` };
}

/** Increase a level by one, up to a ceiling. */
export const MAX_INDENT_LEVEL = 8;

export function indentUp(level: number): number {
  return Math.min(MAX_INDENT_LEVEL, Math.max(0, Math.trunc(level)) + 1);
}

/** Decrease a level by one, never below zero. */
export function indentDown(level: number): number {
  return Math.max(0, Math.trunc(level) - 1);
}
