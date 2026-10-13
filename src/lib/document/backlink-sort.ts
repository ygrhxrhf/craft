/**
 * Backlinks panel sorting (G147). The official panel offers three orders — alphabetically, by
 * creation date, and by link count — plus an expand/collapse-all control. The first two are
 * straightforward; "by link count" needs a per-source count, which the local read does not carry,
 * so an entry without one falls back to its title rather than sorting as zero.
 */
import type { BacklinkItem } from '@/actions/document/backlinks';

export type BacklinkSort = 'alphabetical' | 'created' | 'linkCount';

export const BACKLINK_SORTS: readonly BacklinkSort[] = ['alphabetical', 'created', 'linkCount'];

export const BACKLINK_SORT_LABELS: Record<BacklinkSort, string> = {
  alphabetical: '按字母顺序',
  created: '创建日期',
  linkCount: '按链接数',
};

/** A backlink plus the link count the read does not currently carry. */
export interface SortableBacklink extends BacklinkItem {
  linkCount?: number;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * Sort a copy of the list. Alphabetical uses the collator on the title; created sorts newest
 * first; link count sorts high to low, and an entry with no count keeps its title order among the
 * uncounted rather than being treated as zero.
 */
export function sortBacklinks(
  items: readonly SortableBacklink[],
  sort: BacklinkSort,
): SortableBacklink[] {
  const copy = [...items];
  switch (sort) {
    case 'alphabetical':
      return copy.sort((a, b) => collator.compare(a.sourceTitle, b.sourceTitle));
    case 'created':
      return copy.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    case 'linkCount':
      return copy.sort((a, b) => {
        const left = a.linkCount;
        const right = b.linkCount;
        if (left === undefined && right === undefined) {
          return collator.compare(a.sourceTitle, b.sourceTitle);
        }
        if (left === undefined) return 1;
        if (right === undefined) return -1;
        return right - left;
      });
  }
}
