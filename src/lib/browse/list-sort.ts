/**
 * The list view's column headers are the sorters (G247). The official row of four headers —
 * 名称 / 上次浏览 / 已更新 / 已创建 — is clickable, the active column carries a direction arrow
 * (the observed screen shows 「已更新 ↓」), and the four columns map one-to-one onto the four orders
 * the screen's ⋯ menu offers.
 *
 * This is a *different* vocabulary from `sort.ts` (whose four dimensions are name / shared / sharedBy
 * / lastViewed): the list's four are the same four the browse toolbar shows, so the two agree on the
 * screen even though the menus differ. Keeping the comparator here means neither vocabulary has to
 * absorb the other.
 */

import type { BrowseSortOption } from './toolbar-menu';
import { compareByTier, type BrowseSortTier, type TierSortable } from './sort-tiers';

export type SortDirection = 'ascending' | 'descending';

export interface BrowseSortSpec {
  option: BrowseSortOption;
  direction: SortDirection;
}

/** The default the ledger records for this screen: 更新日期, descending. */
export const DEFAULT_BROWSE_SORT_SPEC: BrowseSortSpec = {
  option: 'updated',
  direction: 'descending',
};

/** The list's four columns, in the order they render, each bound to the order it sorts by. */
export const LIST_SORT_COLUMNS: readonly { option: BrowseSortOption; label: string }[] = [
  { option: 'name', label: '名称' },
  { option: 'lastViewed', label: '上次浏览' },
  { option: 'updated', label: '已更新' },
  { option: 'created', label: '已创建' },
] as const;

/** The column a given order sorts by, or `null` when no column owns it. */
export function sortColumnFor(
  option: BrowseSortOption,
): (typeof LIST_SORT_COLUMNS)[number] | null {
  return LIST_SORT_COLUMNS.find((column) => column.option === option) ?? null;
}

/**
 * What clicking a header does. Clicking the active column flips its direction; clicking a different
 * one switches to it and starts **descending**, which is the direction the official screen shows by
 * default (「已更新 ↓」) — a fresh column should read newest-first, not oldest-first.
 */
export function nextSortSpec(current: BrowseSortSpec, clicked: BrowseSortOption): BrowseSortSpec {
  if (current.option === clicked) {
    return {
      option: clicked,
      direction: current.direction === 'descending' ? 'ascending' : 'descending',
    };
  }
  return { option: clicked, direction: 'descending' };
}

/** The `aria-sort` value for a column under a spec; `none` when the column is not the active one. */
export function ariaSortValue(
  spec: BrowseSortSpec,
  column: BrowseSortOption,
): 'ascending' | 'descending' | 'none' {
  return spec.option === column ? spec.direction : 'none';
}

/** The arrow a column shows, or `null` when it is not the active one. */
export function sortArrow(spec: BrowseSortSpec, column: BrowseSortOption): '↑' | '↓' | null {
  if (spec.option !== column) return null;
  return spec.direction === 'ascending' ? '↑' : '↓';
}

/** The value each order reads. `lastViewed` falls back to the update time, as the ledger records. */
export interface SortableRow {
  title: string;
  updatedAt: string;
  createdAt?: string | null;
  lastViewedAt?: string | null;
  /** G348：Kind／Manual 两档在数据层可用（菜单不列）。 */
  kind?: string | null;
  order?: number | null;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function valueFor(row: SortableRow, option: BrowseSortOption): string {
  switch (option) {
    case 'name':
      return row.title;
    case 'lastViewed':
      return row.lastViewedAt ?? row.updatedAt;
    case 'created':
      return row.createdAt ?? row.updatedAt;
    case 'updated':
      return row.updatedAt;
  }
}

/**
 * Compare two rows under a spec. 规则只有一套：`sort-tiers.ts` 的 `compareByTier`
 * （G348：空值恒排末尾 + `localeCompare(numeric, base)`）。这里只把行形状喂给它，
 * 不再自己写一遍比较逻辑。
 */
export function compareBrowseRows(a: SortableRow, b: SortableRow, spec: BrowseSortSpec): number {
  const tier: BrowseSortTier =
    spec.option === 'lastViewed'
      ? 'lastViewed'
      : spec.option === 'created'
        ? 'created'
        : spec.option === 'updated'
          ? 'updated'
          : 'name';
  // `lastViewed`／`created` 在本地有回退（缺值读更新时间），先算好再交给比较器。
  const toTierRow = (row: SortableRow): TierSortable => ({
    title: row.title,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt ?? row.updatedAt,
    lastViewedAt: row.lastViewedAt ?? row.updatedAt,
    kind: row.kind ?? null,
    order: row.order ?? null,
  });
  return compareByTier(toTierRow(a), toTierRow(b), tier, spec.direction);
}

/** Sort a copy; the caller's array is never mutated. */
export function sortBrowseRows<T extends SortableRow>(rows: readonly T[], spec: BrowseSortSpec): T[] {
  return [...rows].sort((a, b) => compareBrowseRows(a, b, spec));
}
