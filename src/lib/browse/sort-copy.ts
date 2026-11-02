import type { SortDimension, SortDirection } from './sort';

/**
 * The browse sort menu's strings, each parked next to the i18n key it must match in
 * `feature-catalog.md` so a ledger-as-source test can compare them.
 */
export const SORT_DIMENSION_LABELS: Record<SortDimension, string> = {
  name: '名称',
  shared: '创建/共享日期',
  sharedBy: '分享者',
  lastViewed: '上次浏览',
  created: '创建日期',
  updated: '更新日期',
};

export const SORT_DIMENSION_KEYS: Record<SortDimension, string> = {
  name: 'browse.sort.name',
  shared: 'browse.sort.date.created.shared',
  sharedBy: 'browse.sort.shared.by',
  lastViewed: 'browse.sort.last.viewed',
  created: 'browse.sort.date.created',
  updated: 'browse.sort.date.updated',
};

export const SORT_DIRECTION_LABELS: Record<SortDirection, string> = {
  ascending: '升序',
  descending: '降序',
};

export const SORT_DIRECTION_KEYS: Record<SortDirection, string> = {
  ascending: 'collections.sort.ascending',
  descending: 'collections.sort.descending',
};

export const SORT_BY_LABEL = '排序方式';
export const SORT_BY_KEY = 'browse.sort.by';
