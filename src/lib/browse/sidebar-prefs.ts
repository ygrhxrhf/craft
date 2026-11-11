/**
 * G176/G600 — the sidebar's sections can be reordered and hidden
 * (`sidebar.reorder.or.hide`). The preference lives on the device: it is a layout choice, not
 * document data, and the official panel also keeps it local.
 *
 * The stored shape is deliberately two plain arrays. `normalizeSidebarPrefs` reconciles them with
 * the build's own section list, so adding a section in a later release appends it at its default
 * position instead of dropping it for everyone who already has a saved order.
 */

export const SIDEBAR_SECTION_IDS = [
  '/documents',
  '/favorites',
  '/tags',
  '/inbox',
  '/recent',
  '/daily-notes',
  '/tasks',
  '/calendar',
  '/templates',
  '/connections',
  '/shared-with-me',
  '/trash',
  '/archive',
] as const;

export type SidebarSectionId = (typeof SIDEBAR_SECTION_IDS)[number];

export interface SidebarPrefs {
  order: SidebarSectionId[];
  hidden: SidebarSectionId[];
}

export const DEFAULT_SIDEBAR_PREFS: SidebarPrefs = {
  order: [...SIDEBAR_SECTION_IDS],
  hidden: [],
};

const STORAGE_KEY = 'craft.sidebar.prefs';

const KNOWN = new Set<string>(SIDEBAR_SECTION_IDS);

function ids(value: unknown): SidebarSectionId[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: SidebarSectionId[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !KNOWN.has(entry) || seen.has(entry)) continue;
    seen.add(entry);
    out.push(entry as SidebarSectionId);
  }
  return out;
}

/** Keep exactly the build's sections: saved order first, then any section it has not seen yet. */
export function normalizeSidebarPrefs(raw: unknown): SidebarPrefs {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const savedOrder = ids(source.order);
  const order = [...savedOrder, ...SIDEBAR_SECTION_IDS.filter((id) => !savedOrder.includes(id))];
  const hidden = ids(source.hidden).filter((id) => KNOWN.has(id));
  return { order, hidden };
}

export function moveSidebarSection(
  prefs: SidebarPrefs,
  id: SidebarSectionId,
  delta: -1 | 1,
): SidebarPrefs {
  const index = prefs.order.indexOf(id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= prefs.order.length) return prefs;
  const order = [...prefs.order];
  [order[index], order[target]] = [order[target], order[index]];
  return { ...prefs, order };
}

export function toggleSidebarSection(prefs: SidebarPrefs, id: SidebarSectionId): SidebarPrefs {
  const hidden = prefs.hidden.includes(id)
    ? prefs.hidden.filter((entry) => entry !== id)
    : [...prefs.hidden, id];
  return { ...prefs, hidden };
}

export function visibleSidebarSections(prefs: SidebarPrefs): SidebarSectionId[] {
  return prefs.order.filter((id) => !prefs.hidden.includes(id));
}

export function readSidebarPrefs(storage: { getItem(key: string): string | null }): SidebarPrefs {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SIDEBAR_PREFS;
  try {
    return normalizeSidebarPrefs(JSON.parse(raw));
  } catch {
    return DEFAULT_SIDEBAR_PREFS;
  }
}

const listeners = new Set<() => void>();
let cached: SidebarPrefs | null = null;

export function writeSidebarPrefs(
  storage: { setItem(key: string, value: string): void },
  prefs: SidebarPrefs,
): void {
  cached = normalizeSidebarPrefs(prefs);
  storage.setItem(STORAGE_KEY, JSON.stringify(cached));
  for (const listener of listeners) listener();
}

export function subscribeSidebarPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Client snapshot; the server renders the default order so hydration matches. */
export function readSidebarPrefsNow(): SidebarPrefs {
  if (typeof localStorage === 'undefined') return DEFAULT_SIDEBAR_PREFS;
  if (!cached) cached = readSidebarPrefs(localStorage);
  return cached;
}

export function serverSidebarPrefs(): SidebarPrefs {
  return DEFAULT_SIDEBAR_PREFS;
}