import { describe, expect, it } from 'vitest';

import {
  DEFAULT_VIEW_MODE,
  LAYOUT_ENTRY_LABEL,
  VIEW_MODES,
  isViewMode,
  resolveViewMode,
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
