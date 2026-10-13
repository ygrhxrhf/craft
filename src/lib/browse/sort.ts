/**
 * The browse-screen sort (G1091). The official enum is four dimensions crossed with two
 * directions: `Name | Shared | SharedBy | LastViewed` × `Ascending | Descending`. This module is
 * the pure half — the menu that picks a value is a separate concern — so the ordering rules can
 * be tested without a DOM.
 */

export const SORT_DIMENSIONS = ['name', 'shared', 'sharedBy', 'lastViewed'] as const;
export type SortDimension = (typeof SORT_DIMENSIONS)[number];

export const SORT_DIRECTIONS = ['ascending', 'descending'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export interface SortSpec {
  dimension: SortDimension;
  direction: SortDirection;
}

/** The official default: most recently viewed first. */
export const DEFAULT_SORT: SortSpec = { dimension: 'lastViewed', direction: 'descending' };

export function isSortDimension(value: unknown): value is SortDimension {
  return typeof value === 'string' && (SORT_DIMENSIONS as readonly string[]).includes(value);
}

export function isSortDirection(value: unknown): value is SortDirection {
  return typeof value === 'string' && (SORT_DIRECTIONS as readonly string[]).includes(value);
}

/** One collator for every string column, so names sort the same way in every dimension. */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** The value a dimension reads. `shared` is the boolean "is this shared at all"; `sharedBy` names
 *  the other party. Both are absent on a purely personal document. */
export interface SortableDoc {
  title: string;
  updatedAt: string;
  lastViewedAt?: string | null;
  shared?: boolean;
  sharedBy?: string | null;
}

function valueFor(doc: SortableDoc, dimension: SortDimension): string | boolean {
  switch (dimension) {
    case 'name':
      return doc.title;
    case 'shared':
      return doc.shared === true;
    case 'sharedBy':
      return doc.sharedBy ?? '';
    case 'lastViewed':
      return doc.lastViewedAt ?? doc.updatedAt;
  }
}

/**
 * Compare two documents under a spec. Booleans sort false-before-true; strings use the collator;
 * a missing value sorts after a present one in ascending order (empty last), which is the reading
 * the ledger's "empty pinned" rule gives for the other browse lists.
 */
export function compareDocs(a: SortableDoc, b: SortableDoc, spec: SortSpec): number {
  const left = valueFor(a, spec.dimension);
  const right = valueFor(b, spec.dimension);
  let order: number;
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    order = Number(left) - Number(right);
  } else {
    const l = String(left);
    const r = String(right);
    if (!l && r) order = 1;
    else if (l && !r) order = -1;
    else order = collator.compare(l, r);
  }
  // Negating a zero gives `-0`, which is not the same value as `0` to a strict comparison.
  if (order === 0) return 0;
  return spec.direction === 'ascending' ? order : -order;
}

/** Sort a copy; the caller's array is never mutated. */
export function sortDocs<T extends SortableDoc>(docs: readonly T[], spec: SortSpec): T[] {
  return [...docs].sort((a, b) => compareDocs(a, b, spec));
}
