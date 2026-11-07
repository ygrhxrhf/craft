import { describe, expect, it } from 'vitest';

import {
  CUSTOMIZE_SIDEBAR_LABEL,
  DEFAULT_SIDEBAR_VIEW,
  SHOW_GROUP_TITLE,
  VIEW_SWITCH_ITEMS,
  activeViewSwitchId,
  readSidebarView,
  showsCustomizeEntry,
  writeSidebarView,
} from './sidebar-view';

/**
 * G1452：弹层的四件可读——分组标题走 `header`、行 id 与文案不同源、选中态是 rightContent 槽里的
 * 一枚勾、「自定义侧边栏」只在 browse 档出现。
 */
describe('the sidebar view-switch popover', () => {
  it('titles its group 显示 and keeps ids distinct from labels', () => {
    expect(SHOW_GROUP_TITLE).toBe('显示');
    expect(VIEW_SWITCH_ITEMS.map((item) => [item.id, item.label])).toEqual([
      ['tableOfContents', '文档'],
      ['organize', '文件夹'],
    ]);
  });

  it('marks the selected row by id, not by re-deriving it from the label', () => {
    expect(activeViewSwitchId('document')).toBe('tableOfContents');
    expect(activeViewSwitchId('browse')).toBe('organize');
  });

  it('offers 自定义侧边栏 only in the browse view', () => {
    expect(CUSTOMIZE_SIDEBAR_LABEL).toBe('自定义侧边栏');
    expect(showsCustomizeEntry('browse')).toBe(true);
    expect(showsCustomizeEntry('document')).toBe(false);
  });

  it('persists the view on this device and defaults to the document view', () => {
    const box = new Map<string, string>();
    const storage = {
      getItem: (key: string) => box.get(key) ?? null,
      setItem: (key: string, value: string) => void box.set(key, value),
    };
    expect(readSidebarView(storage)).toBe(DEFAULT_SIDEBAR_VIEW);
    writeSidebarView(storage, 'browse');
    expect(readSidebarView(storage)).toBe('browse');
  });
});