/**
 * G223 「显示每日笔记」：这一屏默认显示日记（菜单里带 ✓），关掉后只留普通文档。
 * 与视图模式同一条轴——官方存在空间偏好里，本地留在本机。
 */
const STORAGE_KEY = 'craft.browse.showDailyNotes';

const listeners = new Set<() => void>();

export const DEFAULT_SHOW_DAILY_NOTES = true;

export function readShowDailyNotes(): boolean {
  if (typeof localStorage === 'undefined') return DEFAULT_SHOW_DAILY_NOTES;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? DEFAULT_SHOW_DAILY_NOTES : stored === 'true';
}

export function storeShowDailyNotes(show: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(show));
  listeners.forEach((listener) => listener());
}

export function subscribeShowDailyNotes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function serverShowDailyNotes(): boolean {
  return DEFAULT_SHOW_DAILY_NOTES;
}
