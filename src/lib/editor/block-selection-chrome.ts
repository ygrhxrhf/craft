/**
 * G618: the local block-selection state (Escape → `NodeSelection`, `Shift-↑/↓` → an index set in
 * `useBlockSelectStore`) had **no visible chrome at all**. The official build grows the document
 * by ~14 KB on `Ctrl+A`, which is what a per-block affordance looks like; a state the user cannot
 * see is indistinguishable from no state.
 *
 * This module only turns selected indices into document ranges; the plugin next to it renders one
 * outline plus one badge node per range.
 */

export interface ChromeRange {
  /** The top-level block index the chrome belongs to. */
  index: number;
  from: number;
  to: number;
}

/** The slice of a document this needs (`childCount` + per-child `nodeSize`). */
export interface SizedDoc {
  childCount: number;
  child: (index: number) => { nodeSize: number };
}

/**
 * Resolve top-level indices to positions, dropping anything out of bounds and any duplicate, so a
 * stale store value can never produce a decoration outside the document.
 */
export function selectionChromeRanges(
  doc: SizedDoc,
  indices: readonly number[],
): ChromeRange[] {
  const ranges: ChromeRange[] = [];
  const seen = new Set<number>();
  let offset = 0;
  const starts: number[] = [];
  for (let i = 0; i < doc.childCount; i += 1) {
    starts.push(offset);
    offset += doc.child(i).nodeSize;
  }
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= doc.childCount) continue;
    if (seen.has(index)) continue;
    seen.add(index);
    const from = starts[index];
    ranges.push({ index, from, to: from + doc.child(index).nodeSize });
  }
  return ranges.sort((a, b) => a.index - b.index);
}