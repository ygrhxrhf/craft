/**
 * G1452 — the sidebar's view-switch popover, and where its selected view lives.
 *
 * Four readable facts from the official component shape this module:
 *  1. the popover groups its rows under a `header` field (「显示」), separate from a row's `text`;
 *  2. a row's `id` is **not** the key its label comes from — id `tableOfContents` shows 「文档」,
 *     id `organize` shows 「文件夹」. So both are stored here as two fields; never derive one from
 *     the other;
 *  3. the current view is marked by an icon in the row's `rightContent` slot, not by a class;
 *  4. the 「自定义侧边栏」 entry only appears in the browse view.
 *
 * The chosen view is a device preference (the official panel keeps it local too).
 */

export type SidebarView = 'document' | 'browse';

export interface ViewSwitchItem {
  /** The official row id — deliberately different from the label's source key. */
  id: string;
  label: string;
  view: SidebarView;
}

/** `show` — the group header. */
export const SHOW_GROUP_TITLE = '显示';

/** id ≠ label: `tableOfContents` → `document`, `organize` → `folders`. */
export const VIEW_SWITCH_ITEMS: readonly ViewSwitchItem[] = [
  { id: 'tableOfContents', label: '文档', view: 'document' },
  { id: 'organize', label: '文件夹', view: 'browse' },
] as const;

/** `browse.customize.sidebar` — only offered while the browse view is selected. */
export const CUSTOMIZE_SIDEBAR_LABEL = '自定义侧边栏';

export const DEFAULT_SIDEBAR_VIEW: SidebarView = 'document';

const STORAGE_KEY = 'craft.sidebar.view';

export function activeViewSwitchId(view: SidebarView): string {
  return (VIEW_SWITCH_ITEMS.find((item) => item.view === view) ?? VIEW_SWITCH_ITEMS[0]).id;
}

export function showsCustomizeEntry(view: SidebarView): boolean {
  return view === 'browse';
}

export function readSidebarView(storage: { getItem(key: string): string | null }): SidebarView {
  return storage.getItem(STORAGE_KEY) === 'browse' ? 'browse' : 'document';
}

const listeners = new Set<() => void>();
let cached: SidebarView | null = null;

export function writeSidebarView(
  storage: { setItem(key: string, value: string): void },
  view: SidebarView,
): void {
  cached = view;
  try {
    storage.setItem(STORAGE_KEY, view);
  } catch {
    // A blocked storage still changes this session's view; nothing else to do.
  }
  for (const listener of listeners) listener();
}

export function subscribeSidebarView(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Client snapshot; the server renders the default so hydration matches. */
export function readSidebarViewNow(): SidebarView {
  if (typeof localStorage === 'undefined') return DEFAULT_SIDEBAR_VIEW;
  if (!cached) cached = readSidebarView(localStorage);
  return cached;
}

export function serverSidebarView(): SidebarView {
  return DEFAULT_SIDEBAR_VIEW;
}