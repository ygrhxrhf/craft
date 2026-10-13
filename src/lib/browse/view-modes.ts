/**
 * The browse view modes (G234). Three, not two: grid, list, and a waterfall (`waterfall`) that
 * the ledger's earlier notes missed. One entry sentence covers layout, view and sort together.
 */
export type BrowseViewMode = 'grid' | 'list' | 'waterfall';

export interface ViewModeInfo {
  id: BrowseViewMode;
  label: string;
}

export const VIEW_MODES: readonly ViewModeInfo[] = [
  { id: 'grid', label: '网格' },
  { id: 'list', label: '列表' },
  { id: 'waterfall', label: '瀑布' },
] as const;

/** The default mode a browse screen opens in. */
export const DEFAULT_VIEW_MODE: BrowseViewMode = 'grid';

/** The single entry sentence for layout, view and sort. */
export const LAYOUT_ENTRY_LABEL = '编辑布局视图、排序等…';
export const LAYOUT_ENTRY_KEY = 'browse.edit.layout.view.sort.and.more';

export function isViewMode(value: unknown): value is BrowseViewMode {
  return typeof value === 'string' && VIEW_MODES.some((mode) => mode.id === value);
}

/** Fold an unknown stored value onto the default rather than rendering an unknown mode. */
export function resolveViewMode(value: unknown): BrowseViewMode {
  return isViewMode(value) ? value : DEFAULT_VIEW_MODE;
}
