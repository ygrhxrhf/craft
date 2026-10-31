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

/** Clamp a level into 0…MAX_INDENT_LEVEL; anything non-finite reads as 0. */
export function clampIndent(level: unknown): number {
  const value = typeof level === 'number' && Number.isFinite(level) ? Math.trunc(level) : 0;
  return Math.min(MAX_INDENT_LEVEL, Math.max(0, value));
}

/** The blocks a Tab press can indent: plain paragraphs and headings (G581). */
export const INDENTABLE_TYPES = ['paragraph', 'heading'] as const;

export interface IndentTarget {
  index: number;
  pos: number;
  level: number;
  attrs: Record<string, unknown>;
}

function indexAt(doc: { childCount: number; child: (index: number) => { nodeSize: number } }, pos: number): number {
  if (doc.childCount === 0) return -1;
  let offset = 0;
  for (let index = 0; index < doc.childCount; index += 1) {
    const size = doc.child(index).nodeSize;
    if (pos < offset + size) return index;
    offset += size;
  }
  return doc.childCount - 1;
}

/**
 * Top-level blocks touched by a selection. `to - 1` keeps a caret that sits at the very start of
 * the next block from pulling that block in.
 */
export function indentTargets(
  doc: { childCount: number; child: (index: number) => any },
  from: number,
  to: number,
): IndentTarget[] {
  const start = indexAt(doc, from);
  const end = indexAt(doc, Math.max(from, to - 1));
  if (start < 0 || end < 0) return [];

  const targets: IndentTarget[] = [];
  let pos = 0;
  for (let index = 0; index < doc.childCount; index += 1) {
    const node = doc.child(index);
    if (index >= start && index <= end && (INDENTABLE_TYPES as readonly string[]).includes(node.type.name)) {
      targets.push({ index, pos, level: clampIndent(node.attrs?.indent), attrs: node.attrs ?? {} });
    }
    pos += node.nodeSize;
  }
  return targets;
}
