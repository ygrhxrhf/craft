import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SIDEBAR_PREFS,
  SIDEBAR_SECTION_IDS,
  moveSidebarSection,
  normalizeSidebarPrefs,
  readSidebarPrefs,
  toggleSidebarSection,
  visibleSidebarSections,
  writeSidebarPrefs,
} from './sidebar-prefs';

describe('sidebar reorder/hide preferences (G176/G600)', () => {
  it('starts from the build order with nothing hidden', () => {
    expect(DEFAULT_SIDEBAR_PREFS.order).toEqual([...SIDEBAR_SECTION_IDS]);
    expect(DEFAULT_SIDEBAR_PREFS.hidden).toEqual([]);
  });

  it('reconciles a saved order with sections added later', () => {
    const prefs = normalizeSidebarPrefs({ order: ['/tasks', '/documents', '/gone'], hidden: ['/archive', '/gone'] });
    expect(prefs.order.slice(0, 2)).toEqual(['/tasks', '/documents']);
    expect(prefs.order).toContain('/calendar');
    expect(prefs.order).not.toContain('/gone');
    expect(prefs.hidden).toEqual(['/archive']);
  });

  it('moves a section one slot and refuses to move past either end', () => {
    const moved = moveSidebarSection(DEFAULT_SIDEBAR_PREFS, '/favorites', -1);
    expect(moved.order.slice(0, 2)).toEqual(['/favorites', '/documents']);
    expect(moveSidebarSection(DEFAULT_SIDEBAR_PREFS, '/documents', -1)).toBe(DEFAULT_SIDEBAR_PREFS);
    expect(moveSidebarSection(DEFAULT_SIDEBAR_PREFS, '/archive', 1)).toBe(DEFAULT_SIDEBAR_PREFS);
  });

  it('toggles a section out of the visible list and back', () => {
    const hidden = toggleSidebarSection(DEFAULT_SIDEBAR_PREFS, '/tags');
    expect(visibleSidebarSections(hidden)).not.toContain('/tags');
    expect(visibleSidebarSections(toggleSidebarSection(hidden, '/tags'))).toContain('/tags');
  });

  it('round-trips through storage and reads a broken value as the default', () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
    };
    const custom = { order: [...DEFAULT_SIDEBAR_PREFS.order].reverse(), hidden: ['/trash' as const] };
    writeSidebarPrefs(adapter, custom);
    expect(readSidebarPrefs(adapter)).toEqual(custom);
    storage.set('craft.sidebar.prefs', '{broken');
    expect(readSidebarPrefs(adapter)).toEqual(DEFAULT_SIDEBAR_PREFS);
  });
});