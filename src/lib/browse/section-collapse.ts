/**
 * G391 — a sidebar section collapses behind a hard-coded threshold, with one shared collapse row.
 *
 * Official (`tags-browse.md` §10.4): `RBt = 20, nP = 25` — the Inbox section collapses above 25
 * rows, the other sections above 20. The collapse row is one component taking
 * `{isExpanded, remainingCount, showLessLabel: tasks.show.less, showMoreLabelFactory:
 * browse.show.x.more{0:n}, onToggle, textLeftOffset: 22}`; the Inbox section additionally needs
 * `isOpen && rows.length > 0` to render at all.
 *
 * The two labels come from different namespaces in the official build (`tasks.show.less` for
 * collapse, `browse.show.x.more` for expand) — that inconsistency is theirs and is kept here.
 */

export const SECTION_COLLAPSE_THRESHOLD = 20;
export const INBOX_COLLAPSE_THRESHOLD = 25;
/** Official `textLeftOffset: 22` on the collapse row. */
export const COLLAPSE_ROW_TEXT_LEFT_OFFSET = 22;

export const SHOW_LESS_LABEL = '显示较少';
export const SHOW_LESS_KEY = 'tasks.show.less';

export const SHOW_MORE_KEY = 'browse.show.x.more';
export const SHOW_MORE_TEMPLATE = '再显示 [0] 项';

/** 「再显示 20 项」 — the row's own label while collapsed; `[0]` counts what is still hidden. */
export function showMoreRowsLabel(remainingCount: number): string {
  return SHOW_MORE_TEMPLATE.replace('[0]', String(remainingCount));
}

export interface CollapsedSection<T> {
  visible: T[];
  /** Rows the collapse row hides; 0 means the threshold was not crossed. */
  remainingCount: number;
  collapsible: boolean;
}

/**
 * `expanded` is the collapse row's own state: collapsed shows the first `threshold` rows, expanded
 * shows them all. Below the threshold nothing is cut and no row is rendered.
 */
export function collapseSection<T>(
  rows: readonly T[],
  threshold: number,
  expanded: boolean,
): CollapsedSection<T> {
  const limit = Math.max(1, threshold);
  if (rows.length <= limit) return { visible: [...rows], remainingCount: 0, collapsible: false };
  const visible = expanded ? [...rows] : rows.slice(0, limit);
  return { visible, remainingCount: rows.length - limit, collapsible: true };
}