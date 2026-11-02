/**
 * G235 —— 搜索面板的「最近使用」列表。官方那枚 `remove.from.recents`（从最近使用中移除）是
 * 列表项上的移除动作；本地此前没有这个列表，补一条纯核 + localStorage 存取。
 *
 * 列表按"最近打开的文档"，最多 8 条，重复打开只前移不重复。
 */

export const REMOVE_FROM_RECENTS = '从最近使用中移除';
export const RECENTS_STORAGE_KEY = 'craft.search.recents';
export const RECENTS_LIMIT = 8;

export interface RecentDocument {
  id: string;
  title: string;
}

export function rememberRecent(
  list: readonly RecentDocument[],
  doc: RecentDocument,
  limit = RECENTS_LIMIT,
): RecentDocument[] {
  const id = String(doc.id ?? '').trim();
  if (!id) return [...list];
  const next = [{ id, title: doc.title || '未命名' }, ...list.filter((item) => item.id !== id)];
  return next.slice(0, Math.max(1, limit));
}

export function forgetRecent(list: readonly RecentDocument[], id: string): RecentDocument[] {
  return list.filter((item) => item.id !== id);
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
      .map((item) => ({ id: item.id, title: String(item.title || '未命名') }))
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
