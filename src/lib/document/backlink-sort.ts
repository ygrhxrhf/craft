/**
 * Backlinks panel sorting (G147). The official panel offers three orders — alphabetically, by
 * creation date, and by link count — plus an expand/collapse-all control. An entry that arrives
 * without a count falls back to its title rather than sorting as zero.
 */
import type { BacklinkItem } from '@/actions/document/backlinks';

export type BacklinkSort = 'alphabetical' | 'created' | 'linkCount';

export const BACKLINK_SORTS: readonly BacklinkSort[] = ['alphabetical', 'created', 'linkCount'];

export const BACKLINK_SORT_LABELS: Record<BacklinkSort, string> = {
  alphabetical: '按字母顺序排序',
  created: '按创建日期排序',
  linkCount: '按链接数排序',
};

/**
 * G63：反链面板有**独立加载态**（官方 `blockdetails.mentions.loading.links`「正在加载此页面的链接…」，
 * `i18n-zh.tsv:634`）。此前 `getBacklinks` 回来之前面板是一片空白，与"没有链接"不可分辨。
 */
export const BACKLINKS_LOADING = '正在加载此页面的链接…';
export const BACKLINKS_LOADING_KEY = 'blockdetails.mentions.loading.links';

/** A backlink as the panel sorts it. The count is optional because older reads omit it. */
export type SortableBacklink = BacklinkItem;

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
