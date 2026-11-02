import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_MENU_GEOMETRY,
  DOCUMENT_MENU_SECTIONS,
  DOCUMENT_VIEW_ITEMS,
  staticItemsOf,
} from './document-menu';

describe('DOCUMENT_MENU_SECTIONS (G1451: the five groups, in order)', () => {
  it('has exactly the five official group ids', () => {
    expect(DOCUMENT_MENU_SECTIONS.map((section) => section.id)).toEqual([
      'styleSection',
      'navigationSection',
      'viewSection',
      'documentActionsSection',
      'documentManagementSection',
    ]);
  });

  it('carries the collected labels verbatim', () => {
    const labels = DOCUMENT_MENU_SECTIONS.flatMap((s) => staticItemsOf(s).map((i) => i.label));
    expect(labels).toContain('页面样式');
    expect(labels).toContain('在页面中查找');
    expect(labels).toContain('目录');
    expect(labels).toContain('视图');
    expect(labels).toContain('移至');
    expect(labels).toContain('撤销/重做');
  });

  it('the document-level 「移至」 uses commands.move.to — not the block-level 移动到…', () => {
    const moveTo = DOCUMENT_MENU_SECTIONS.flatMap(staticItemsOf).find((i) => i.id === 'moveTo');
    expect(moveTo?.key).toBe('commands.move.to');
    expect(moveTo?.label).toBe('移至');
  });

  it('view does not close the menu (preventCloseOnClick)', () => {
    const view = DOCUMENT_MENU_SECTIONS.flatMap(staticItemsOf).find((i) => i.id === 'view');
    expect(view?.preventCloseOnClick).toBe(true);
  });

  it('keeps the two context-injected slots out of the static roster', () => {
    // 官方 documentActionsSection 首枚与 documentManagementSection 末枚都是运行时注入。
    const actions = DOCUMENT_MENU_SECTIONS.find((s) => s.id === 'documentActionsSection')!;
    const management = DOCUMENT_MENU_SECTIONS.find((s) => s.id === 'documentManagementSection')!;
    expect(actions.items.some((i) => i.dynamic)).toBe(true);
    expect(management.items.some((i) => i.dynamic)).toBe(true);
    // 静态名册里只剩 moveTo / undo 这类真条目。
    expect(staticItemsOf(actions).map((i) => i.id)).toEqual(['moveTo']);
    expect(staticItemsOf(management).map((i) => i.id)).toEqual(['undo']);
  });
});

describe('DOCUMENT_VIEW_ITEMS (G1451: the view sub-column)', () => {
  it('has the four entries verbatim', () => {
    expect(DOCUMENT_VIEW_ITEMS.map((i) => i.label)).toEqual(['页面信息', '任务', '附件', '评论']);
  });
});

describe('DOCUMENT_MENU_GEOMETRY', () => {
  it('matches the measured anchors', () => {
    expect(DOCUMENT_MENU_GEOMETRY.width).toBe(216);
    expect(DOCUMENT_MENU_GEOMETRY.placement).toBe('bottom-end');
  });
});
