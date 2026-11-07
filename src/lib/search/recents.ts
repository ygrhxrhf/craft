/**
 * G235 —— 搜索面板的「最近使用」列表。官方那枚 `remove.from.recents`（从最近使用中移除）是
 * 列表项上的移除动作；本地此前没有这个列表，补一条纯核 + localStorage 存取。
 *
 * 列表按"最近打开的文档"，最多 8 条，重复打开只前移不重复。
 */

export const REMOVE_FROM_RECENTS = '从最近使用中移除';
export const RECENTS_STORAGE_KEY = 'craft.search.recents';
/**
 * G355：官方「最近文档」组的截断常量是 20（`git = 20`，`tags-browse.md` §9.4）。此前本地取 8，
 * 是面板自己的选择，不是官方值。
 */
export const RECENTS_LIMIT = 20;

export interface RecentDocument {
  id: string;
  title: string;
  /**
   * G355：官方那支「最近文档」组按文档自己的 `updatedAt` 排，不按打开顺序。每条记下打开那一刻
   * 读到的 ISO 时间；缺失（旧存量数据）的条目排在有时间的条目之后。
   */
  updatedAt?: string;
}

export function rememberRecent(
  list: readonly RecentDocument[],
  doc: RecentDocument,
  limit = RECENTS_LIMIT,
): RecentDocument[] {
  const id = String(doc.id ?? '').trim();
  if (!id) return [...list];
  // 重开一条已在列表里的文档时，调用方未必带 updatedAt；沿用存量值而不是抹成 undefined，
  // 否则排序会在"从最近里再点开一次"之后失效。
  const previous = list.find((item) => item.id === id);
  const updatedAt = doc.updatedAt ?? previous?.updatedAt;
  const entry: RecentDocument = { id, title: doc.title || '未命名' };
  if (updatedAt) entry.updatedAt = updatedAt;
  const next = [entry, ...list.filter((item) => item.id !== id)];
  return next.slice(0, Math.max(1, limit));
}

export function forgetRecent(list: readonly RecentDocument[], id: string): RecentDocument[] {
  return list.filter((item) => item.id !== id);
}

/**
 * G355：官方那支「最近文档」组先把**正在看的这篇**剔除，再按 `getDocumentSortFunction(Updated,
 * Ascending)` 排、最后截断 20 条（`[...docs].filter(d => d.id !== currentDocId).sort(cmp).slice(0, git)`）。
 * 升序＝最久没更新的一篇在最前。没有 `updatedAt` 的旧条目排在所有有时间的条目之后（保持原有相对顺序）。
 */
export function recentForDisplay(
  list: readonly RecentDocument[],
  currentDocumentId?: string | null,
  limit = RECENTS_LIMIT,
): RecentDocument[] {
  const current = currentDocumentId ?? null;
  return list
    .filter((item) => item.id !== current)
    .sort(compareUpdatedAscending)
    .slice(0, Math.max(1, limit));
}

/** `Updated` 升序；缺失/坏时间戳一律排到末尾，同档保持调用方给的顺序（`sort` 是稳定的）。 */
function compareUpdatedAscending(a: RecentDocument, b: RecentDocument): number {
  const left = updatedAtMs(a.updatedAt);
  const right = updatedAtMs(b.updatedAt);
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function updatedAtMs(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/** 读 localStorage；坏数据或不可用（SSR/隐私模式）一律当空列表。 */
export function loadRecents(storage?: Pick<Storage, 'getItem'>): RecentDocument[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentDocument =>
        Boolean(item) && typeof item === 'object' && typeof (item as RecentDocument).id === 'string')
      .map((item) => {
        const entry: RecentDocument = { id: item.id, title: String(item.title || '未命名') };
        if (typeof item.updatedAt === 'string' && !Number.isNaN(Date.parse(item.updatedAt))) {
          entry.updatedAt = item.updatedAt;
        }
        return entry;
      })
      .slice(0, RECENTS_LIMIT);
  } catch {
    return [];
  }
}

export function saveRecents(storage: Pick<Storage, 'setItem'> | undefined, list: readonly RecentDocument[]): void {
  if (!storage) return;
  try {
    storage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(list.slice(0, RECENTS_LIMIT)));
  } catch {
    // 存不下（配额/隐私模式）就不存；列表本身仍然当次可用。
  }
}
