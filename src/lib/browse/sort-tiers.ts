/**
 * G348 —— 浏览排序的**权威枚举是 6 档**（官方 `us`：`Name`／`Updated`／`Created`／`LastViewed`／
 * `Kind`／`Manual`），比较器**两条规则**：
 *   1. **空值恒排末尾**（先按"有没有值"分组，再比内容）；
 *   2. 字符串用 `localeCompare(undefined, { numeric: true, sensitivity: 'base' })`
 *      ⇒ **自然数序**（Doc2 < Doc10）+ 忽略大小写与音标。
 *
 * ★ 与 `toolbar-menu.ts` 的关系：那一份是**可见菜单**的 4 项（名称／上次浏览／创建日期／更新日期），
 * 屏上验过就是 4 条，不能因为这里 6 档就往菜单里加两行。这里给的是**数据层**的排序键：
 * Kind 与 Manual 是**程序可用、菜单不列**的两档。
 */

export const BROWSE_SORT_TIERS = ['name', 'updated', 'created', 'lastViewed', 'kind', 'manual'] as const;
export type BrowseSortTier = (typeof BROWSE_SORT_TIERS)[number];

export function isBrowseSortTier(value: unknown): value is BrowseSortTier {
  return typeof value === 'string' && (BROWSE_SORT_TIERS as readonly string[]).includes(value);
}

/** 一行的可选排序键。缺的键按"空"处理（恒排末尾，不发明默认值）。 */
export interface TierSortable {
  title?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  lastViewedAt?: string | null;
  /** `page` / `collection` / `whiteboard` …（菜单不列，但数据层可按它排）。 */
  kind?: string | null;
  /** 手动排序用的序号（越小越靠前）。 */
  order?: number | null;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** 取某一档的原始值；'manual' 返回数字，其余返回字符串。 */
export function tierValue(row: TierSortable, tier: BrowseSortTier): string | number | null {
  switch (tier) {
    case 'name':
      return row.title ?? null;
    case 'updated':
      return row.updatedAt ?? null;
    case 'created':
      return row.createdAt ?? null;
    case 'lastViewed':
      return row.lastViewedAt ?? null;
    case 'kind':
      return row.kind ?? null;
    case 'manual':
      return typeof row.order === 'number' && Number.isFinite(row.order) ? row.order : null;
  }
}

/** 空值判定：`null`／`undefined`／空串都算空；`0` **不算空**（序号可以就是 0）。 */
function isEmpty(value: string | number | null): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * 按档比较两行。空值**恒排末尾**——注意"恒"：降序时也不把它翻到前面（先翻再排空）。
 */
export function compareByTier(
  a: TierSortable,
  b: TierSortable,
  tier: BrowseSortTier,
  direction: 'ascending' | 'descending' = 'ascending',
): number {
  const left = tierValue(a, tier);
  const right = tierValue(b, tier);
  const leftEmpty = isEmpty(left);
  const rightEmpty = isEmpty(right);
  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;

  let order: number;
  if (typeof left === 'number' && typeof right === 'number') {
    order = left - right;
  } else {
    order = collator.compare(String(left), String(right));
  }
  if (order === 0) return 0;
  return direction === 'ascending' ? order : -order;
}

/** 按档排序一个副本（不改入参）。 */
export function sortByTier<T extends TierSortable>(
  rows: readonly T[],
  tier: BrowseSortTier,
  direction: 'ascending' | 'descending' = 'ascending',
): T[] {
  return [...rows].sort((a, b) => compareByTier(a, b, tier, direction));
}
