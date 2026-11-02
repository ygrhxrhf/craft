import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BROWSE_SORT_CHOICES,
  DEFAULT_BROWSE_SORT,
  TOOLBAR_MENU_GROUPS,
  sortChoiceForSpec,
  sortSpecForChoice,
  toolbarMenuEntries,
} from './toolbar-menu';

/**
 * The browse toolbar's ⋯ menu (G223): seven groups, eleven entries, four sort orders.
 */
describe('the menu structure', () => {
  it('has seven groups and ten entries', () => {
    expect(TOOLBAR_MENU_GROUPS).toHaveLength(7);
    // 1 选择 + 4 排序 + 1 每日笔记 + 1 导入 + 2 导出 + 1 空间设置 = 10. The ledger's prose says
    // "11 项" but its own itemised list enumerates ten; the enumerated list is the one taken.
    expect(toolbarMenuEntries()).toHaveLength(10);
  });

  it('offers four sort orders on this screen, not the general vocabulary', () => {
    expect(BROWSE_SORT_CHOICES.map((c) => c.id)).toEqual(['name', 'lastViewed', 'created', 'updated']);
  });

  it('defaults to 更新日期', () => {
    expect(DEFAULT_BROWSE_SORT).toBe('updated');
    const sortGroup = TOOLBAR_MENU_GROUPS.find((g) => g.title === '排序方式');
    const checked = sortGroup?.entries.filter((e) => e.checked).map((e) => e.id);
    expect(checked).toEqual(['sort:updated']);
  });

  it('has two export entries, Markdown and TextBundle', () => {
    const ids = toolbarMenuEntries().map((e) => e.id);
    expect(ids).toContain('exportMarkdown');
    expect(ids).toContain('exportTextBundle');
  });

  it('has the four single-entry groups', () => {
    const ids = toolbarMenuEntries().map((e) => e.id);
    for (const id of ['select', 'showDailyNotes', 'import', 'spaceSettings']) {
      expect(ids, id).toContain(id);
    }
  });
});

describe('the four orders drive the shared comparator', () => {
  it('maps each choice onto a spec, names ascending and dates newest first', () => {
    expect(sortSpecForChoice('name')).toEqual({ dimension: 'name', direction: 'ascending' });
    expect(sortSpecForChoice('lastViewed')).toEqual({ dimension: 'lastViewed', direction: 'descending' });
    expect(sortSpecForChoice('created')).toEqual({ dimension: 'created', direction: 'descending' });
    expect(sortSpecForChoice('updated')).toEqual({ dimension: 'updated', direction: 'descending' });
  });

  it('folds a shared spec back onto this screen’s four orders', () => {
    expect(sortChoiceForSpec({ dimension: 'created', direction: 'ascending' })).toBe('created');
    // 分享者 is a general-vocabulary dimension this screen does not offer.
    expect(sortChoiceForSpec({ dimension: 'sharedBy', direction: 'ascending' })).toBe(DEFAULT_BROWSE_SORT);
  });
});

describe('the menu is wired into the browse toolbar', () => {
  const grid = readFileSync(join(process.cwd(), 'src/components/document/SortableDocGrid.tsx'), 'utf8');
  const menu = readFileSync(join(process.cwd(), 'src/components/document/BrowseToolbarMenu.tsx'), 'utf8');

  it('renders the real menu instead of the old sort selects', () => {
    expect(grid).toContain('<BrowseToolbarMenu');
    expect(grid).not.toContain('SORT_DIMENSIONS');
    expect(menu).toContain('TOOLBAR_MENU_GROUPS');
    expect(menu).toContain('BROWSE_SORT_CHOICES');
  });

  it('keeps the selection entry the selection tests look for', () => {
    expect(menu).toContain('data-testid="browse-enter-selection"');
    expect(grid).toContain('browse-selection-bar');
  });

  it('wires both export entries and the daily-note switch', () => {
    expect(menu).toContain('exportLibraryZip');
    expect(menu).toContain('exportLibraryTextBundleZip');
    expect(menu).toContain('showDailyNotes');
  });

  // 真浏览器里踩过一次：Base UI 的 GroupLabel 必须在 Menu.Group 内，裸放标签整块弹层直接崩。
  it('wraps every group label inside a menu group', () => {
    const groupAt = menu.indexOf('<DropdownMenuGroup');
    const labelAt = menu.indexOf('<DropdownMenuLabel');
    expect(groupAt).toBeGreaterThan(-1);
    expect(labelAt).toBeGreaterThan(-1);
    expect(groupAt).toBeLessThan(labelAt);
    expect(menu).toContain('{group.title && <DropdownMenuLabel>');
    expect(menu).not.toContain('<Fragment key={group.title');
  });
});
