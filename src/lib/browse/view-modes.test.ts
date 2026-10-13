import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_VIEW_MODE,
  LAYOUT_ENTRY_LABEL,
  VIEW_MODES,
  isViewMode,
  readViewMode,
  resolveViewMode,
  storeViewMode,
} from './view-modes';

/**
 * The browse view modes (G234): three of them, waterfall included.
 */
describe('the three modes', () => {
  it('lists grid, list and waterfall', () => {
    expect(VIEW_MODES.map((m) => m.id)).toEqual(['grid', 'list', 'waterfall']);
    expect(VIEW_MODES.map((m) => m.label)).toEqual(['网格', '列表', '瀑布']);
  });

  it('defaults to grid', () => {
    expect(DEFAULT_VIEW_MODE).toBe('grid');
  });

  it('guards a stored value', () => {
    expect(isViewMode('waterfall')).toBe(true);
    expect(isViewMode('calendar')).toBe(false);
    expect(isViewMode(null)).toBe(false);
  });

  it('folds an unknown value onto the default', () => {
    expect(resolveViewMode('list')).toBe('list');
    expect(resolveViewMode('nonsense')).toBe('grid');
  });
});

describe('the entry sentence', () => {
  it('covers layout, view and sort in one line', () => {
    expect(LAYOUT_ENTRY_LABEL).toBe('编辑布局视图、排序等…');
  });
});

describe('the remembered mode', () => {
  // The test environment is node, so the storage the module probes for is stubbed here rather
  // than assumed. `readViewMode`/`storeViewMode` guard on the global themselves.
  const store = new Map<string, string>();
  const fakeStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };

  beforeEach(() => {
    store.clear();
    (globalThis as { localStorage?: unknown }).localStorage = fakeStorage;
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('reads the default when nothing is stored', () => {
    expect(readViewMode()).toBe(DEFAULT_VIEW_MODE);
  });

  it('remembers a choice on this device', () => {
    storeViewMode('list');
    expect(readViewMode()).toBe('list');
  });

  it('folds a corrupt stored value onto the default', () => {
    fakeStorage.setItem('craft.browse.viewMode', 'kanban');
    expect(readViewMode()).toBe('grid');
  });
});
