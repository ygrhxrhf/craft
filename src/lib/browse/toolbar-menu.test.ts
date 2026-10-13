import { describe, expect, it } from 'vitest';

import {
  BROWSE_SORT_CHOICES,
  DEFAULT_BROWSE_SORT,
  TOOLBAR_MENU_GROUPS,
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
