import { SORT_DIMENSION_KEYS, SORT_DIMENSION_LABELS } from './sort-copy';
import type { SortSpec } from './sort';

/**
 * The browse toolbar's ⋯ menu (G223). Seven groups, eleven entries. Two things differ from the
 * general sort vocabulary: this screen offers only four orders (not the four dimensions crossed
 * with two directions), and its default is 更新日期.
 */

export type BrowseSortOption = 'name' | 'lastViewed' | 'created' | 'updated';

export interface BrowseSortChoice {
  id: BrowseSortOption;
  label: string;
  /** The catalog key the label comes from, so the menu never retypes a collected string. */
  key: string;
}

/** The four orders this screen offers, in the order it offers them. */
export const BROWSE_SORT_CHOICES: readonly BrowseSortChoice[] = [
  { id: 'name', label: SORT_DIMENSION_LABELS.name, key: SORT_DIMENSION_KEYS.name },
  { id: 'lastViewed', label: SORT_DIMENSION_LABELS.lastViewed, key: SORT_DIMENSION_KEYS.lastViewed },
  { id: 'created', label: SORT_DIMENSION_LABELS.created, key: SORT_DIMENSION_KEYS.created },
  { id: 'updated', label: SORT_DIMENSION_LABELS.updated, key: SORT_DIMENSION_KEYS.updated },
] as const;

/** The default the ledger records for this screen. */
export const DEFAULT_BROWSE_SORT: BrowseSortOption = 'updated';

/** The screen's order maps onto the shared comparator; names read A→Z, dates newest first. */
export function sortSpecForChoice(choice: BrowseSortOption): SortSpec {
  return {
    dimension: choice,
    direction: choice === 'name' ? 'ascending' : 'descending',
  };
}

/** Fold a shared spec back onto this screen's four orders; unknown dimensions read as 更新日期. */
export function sortChoiceForSpec(spec: SortSpec): BrowseSortOption {
  return (BROWSE_SORT_CHOICES.some((choice) => choice.id === spec.dimension)
    ? spec.dimension
    : DEFAULT_BROWSE_SORT) as BrowseSortOption;
}

export type ToolbarMenuGroup = {
  /** The group title, when the group has one. */
  title?: string;
  entries: { id: string; label: string; checked?: boolean }[];
};

/**
 * The menu's seven groups. The sort group carries the four choices; the export group has two
 * entries (Markdown and TextBundle) rather than one.
 */
export const TOOLBAR_MENU_GROUPS: readonly ToolbarMenuGroup[] = [
  { entries: [{ id: 'select', label: '选择' }] },
  {
    title: '排序方式',
    entries: BROWSE_SORT_CHOICES.map((choice) => ({
      id: `sort:${choice.id}`,
      label: choice.label,
      checked: choice.id === DEFAULT_BROWSE_SORT,
    })),
  },
  { entries: [{ id: 'showDailyNotes', label: '显示每日笔记' }] },
  { entries: [{ id: 'import', label: '导入' }] },
  { entries: [{ id: 'exportMarkdown', label: '导出为 Markdown' }] },
  { entries: [{ id: 'exportTextBundle', label: '导出为 TextBundle' }] },
  { entries: [{ id: 'spaceSettings', label: '空间设置' }] },
] as const;

/** The eleven entries, flattened. */
export function toolbarMenuEntries() {
  return TOOLBAR_MENU_GROUPS.flatMap((group) => group.entries);
}
