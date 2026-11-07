/**
 * Block indentation (G218). Indentation is carried by a CSS variable on the block, one level per
 * 28px, and the variable is omitted entirely at level 0 — so a block with no indent has no
 * `--indent-w` at all rather than `0px`. That distinction is what the ledger records when it says
 * the property "disappears" at zero.
 */

import { indentRunOf } from './indent-run';

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

/**
 * The raw level of a block. G660: an explicit `null` is neutral for the run, while a block type
 * with no `indent` slot at all (`undefined`) ends it — it cannot be nested.
 */
function rawLevel(node: { attrs?: Record<string, unknown> }): number | null | undefined {
  const raw = node.attrs?.indent;
  if (raw === null) return null;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

/**
 * G627 / G912 —— `Tab`/`Shift+Tab` 是 `sm([id], map, ±1)`：把入参块**并上它的缩进子块**，再
 * 对整批一次 `og(ids, delta)`。⇒ 缩进天生带动整棵子树。
 *
 * 「缩进子块」＝`indentRunOf` 那段几何区间（紧随其后、层级**严格更大**的连续段）。严格更大这
 * 一条正是 G613 与 G912 能在同一式子上共存的原因：父块 1 档、后一块也 1 档时后者不是子块，
 * 屏幕实测里「子块 28px 原地不动」；父块 0 档、后两块 1 档时三者一起 ＋28。
 *
 * 每一块的下界各自夹到 0（官方 per-block `indentLevel + delta >= 0`），所以减档不会把整段
 * 压穿。
 */
export function indentTargetsWithChildren(
  doc: { childCount: number; child: (index: number) => any },
  from: number,
  to: number,
): IndentTarget[] {
  const plain = indentTargets(doc, from, to);
  if (!plain.length) return plain;

  const levels = Array.from({ length: doc.childCount }, (_, index) => rawLevel(doc.child(index)));
  const sizes = Array.from({ length: doc.childCount }, (_, index) => doc.child(index).nodeSize);
  const offsets: number[] = [];
  let running = 0;
  for (const size of sizes) {
    offsets.push(running);
    running += size;
  }

  const covered = new Set<number>();
  for (const target of plain) {
    const run = indentRunOf(levels, target.index);
    for (let index = run.start; index < run.end; index += 1) covered.add(index);
  }

  const targets: IndentTarget[] = [];
  for (const index of [...covered].sort((a, b) => a - b)) {
    const node = doc.child(index);
    if (!(INDENTABLE_TYPES as readonly string[]).includes(node.type.name)) continue;
    targets.push({
      index,
      pos: offsets[index],
      level: clampIndent(node.attrs?.indent),
      attrs: node.attrs ?? {},
    });
  }
  return targets;
}
