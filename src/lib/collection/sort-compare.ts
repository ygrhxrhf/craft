/**
 * The official sort, from `docs/craft-ref/features/protocol.md` §九: one
 * `Intl.Collator(undefined, { numeric: true, sensitivity: "base" })` for every column — numbers
 * aware (`item2` before `item10`), case- and accent-insensitive — and blanks first in both
 * directions (`null → -1`).
 *
 * The ledger's excerpt names `null` only; this build also treats `''` as blank, because its text
 * cells store empty strings and otherwise an empty cell would fall to the bottom on descending.
 * That extension is local and is not quoted anywhere as official.
 */

export type SortDirection = 'asc' | 'desc';

const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function isBlank(value: unknown): boolean {
  return value == null || value === '';
}

/**
 * Compare two cell values, honouring the direction for non-blanks only: a blank always sorts
 * first, so flipping the direction cannot push empties to the bottom.
 */
export function compareForSort(a: unknown, b: unknown, direction: SortDirection): number {
  const aBlank = isBlank(a);
  const bBlank = isBlank(b);
  if (aBlank && bBlank) return 0;
  if (aBlank) return -1;
  if (bBlank) return 1;
  const comparison = COLLATOR.compare(String(a), String(b));
  return direction === 'asc' ? comparison : -comparison;
}
