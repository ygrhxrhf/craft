/**
 * The browse list layout's four columns (G1115 / G1117). The official header renders all four
 * unconditionally and lets CSS decide visibility, so the three data columns are *slots* — the
 * class names below say "second/third/fourth column", not "this is the last-viewed column". A
 * variant that re-orders the data still hangs the same classes on the same positions.
 *
 * Visibility is keyed on the named layout container (G1124), not the viewport: 更新/创建 appear
 * from 768px of *content* width, 上次浏览 from 1024px.
 */

export const LIST_COLUMNS = ['name', 'lastViewed', 'updated', 'created'] as const;
export type ListColumn = (typeof LIST_COLUMNS)[number];

/** Header labels, each next to the i18n key the catalog holds. Two of them are bare keys. */
export const LIST_COLUMN_LABELS: Record<ListColumn, string> = {
  name: '名称',
  lastViewed: '上次浏览',
  updated: '已更新',
  created: '已创建',
};

export const LIST_COLUMN_KEYS: Record<ListColumn, string> = {
  name: 'name',
  lastViewed: 'browse.sort.last.viewed',
  updated: 'updated',
  created: 'created',
};

/** The slot classes the container queries reveal; the name column is never hidden. */
export const LIST_COLUMN_CLASSES: Record<Exclude<ListColumn, 'name'>, string> = {
  lastViewed: 'app-col-last-viewed',
  updated: 'app-col-updated',
  created: 'app-col-created',
};

/** The custom property each data cell reads its width from, with the CSS-side `8rem` fallback. */
export const COLUMN_WIDTH_VARS: Record<Exclude<ListColumn, 'name'>, string> = {
  lastViewed: '--col-last-viewed-width',
  updated: '--col-updated-width',
  created: '--col-created-width',
};

export const COLUMN_WIDTH_FALLBACK = '8rem';

/**
 * What the width sync writes. A hidden column measures 0, so it is written as `0px` — which is
 * what makes the CSS `8rem` fallback unreachable, exactly as the official build behaves.
 */
export function columnWidthValue(width: number): string {
  return `${Math.round(width)}px`;
}

/** The header cell's typography class, verbatim from the collected class table. */
export const LIST_HEADER_TYPOGRAPHY = 'typography-caption-md-500';
export const LIST_TITLE_TYPOGRAPHY = 'typography-ui-md-600';
export const LIST_CELL_TYPOGRAPHY = 'typography-ui-sm-500';
