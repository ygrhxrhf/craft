/**
 * 快捷键面板的编辑层分类（G755 / G771 / G1622 / G745）。
 *
 * 官方面板的真实层级是**两段**：18 个段（`getTitle` 逐段读到，段标题就是屏上那些 H3）折叠成
 * 7 个标签页（屏上左栏的 7 枚按钮）。分发用的 `KeyBinding.group` 是**上下文轴**（哪一层吃键），
 * 与这里的**展示轴**不是一回事：例如「标记取消」在官方分类里属于「任务」，而本地按任务视图与
 * 正文两种上下文分别绑键。两张轴各自单测，避免为了面板好看去改分发。
 *
 * 「文档」这个标签页在源里没有段标题（G771：段标题数组为空），所以它的行直接挂在分类标题下，
 * 渲染层不给这一档印 H3。
 */

import type { KeyBinding } from './keymap';

export type PanelTabId =
  | 'general'
  | 'document'
  | 'tasks'
  | 'editing'
  | 'style'
  | 'organize'
  | 'collections';

export interface PanelTab {
  id: PanelTabId;
  label: string;
  /** 官方语言包里的键；`null`＝屏上有这一档但语言包没有专键（本地串取自采集面）。 */
  key: string | null;
}

/** 屏上左栏七档，顺序照官方。 */
export const PANEL_TABS: readonly PanelTab[] = [
  { id: 'general', label: '通用', key: 'commands.shortcuts.keyboard.general' },
  { id: 'document', label: '文档', key: null },
  { id: 'tasks', label: '任务', key: null },
  { id: 'editing', label: '编辑', key: 'commands.shortcuts.keyboard.editing' },
  { id: 'style', label: '样式', key: 'onboarding.menu.styling' },
  { id: 'organize', label: '整理', key: 'organize' },
  { id: 'collections', label: '合集', key: 'collections' },
] as const;

export type PanelSectionId =
  | 'general-navigation'
  | 'general-view'
  | 'tasks-global'
  | 'tasks-views'
  | 'editing-insert'
  | 'editing-selection'
  | 'editing-comments'
  | 'editing-find-replace'
  | 'editing-other'
  | 'style-text'
  | 'style-list'
  | 'style-decorations'
  | 'style-indentation'
  | 'style-format'
  | 'organize-move'
  | 'organize-group'
  | 'collections-tables'
  | 'collections-collections';

export interface PanelSection {
  id: PanelSectionId;
  tab: PanelTabId;
  title: string;
  key: string;
}

/** 18 段，按所属标签页与官方段序排。 */
export const PANEL_SECTIONS: readonly PanelSection[] = [
  { id: 'general-navigation', tab: 'general', title: '导航', key: 'commands.navigation' },
  { id: 'general-view', tab: 'general', title: '视图', key: 'view' },
  { id: 'tasks-global', tab: 'tasks', title: '全局快捷键', key: 'tasks.global.shortcuts' },
  { id: 'tasks-views', tab: 'tasks', title: '在任务视图中', key: 'commands.shortcuts.in.tasks.views' },
  { id: 'editing-insert', tab: 'editing', title: '插入新区块', key: 'commands.insert.new.block' },
  { id: 'editing-selection', tab: 'editing', title: '编辑选择', key: 'commands.edit.selection' },
  { id: 'editing-comments', tab: 'editing', title: '评论', key: 'comments' },
  { id: 'editing-find-replace', tab: 'editing', title: '在查找和替换中', key: 'commands.shortcuts.in.find.and.replace' },
  { id: 'editing-other', tab: 'editing', title: '其他', key: 'other' },
  { id: 'style-text', tab: 'style', title: '文本样式', key: 'style.text.style' },
  { id: 'style-list', tab: 'style', title: '列表', key: 'browse.list' },
  { id: 'style-decorations', tab: 'style', title: '装饰', key: 'style.decorations' },
  { id: 'style-indentation', tab: 'style', title: '缩进', key: 'style.indentation' },
  { id: 'style-format', tab: 'style', title: '文字格式', key: 'style.inline.format' },
  { id: 'organize-move', tab: 'organize', title: '移动所选区块', key: 'commands.move.blocks.selection' },
  { id: 'organize-group', tab: 'organize', title: '组合与取消组合', key: 'commands.group.and.ungroup' },
  { id: 'collections-tables', tab: 'collections', title: '在表格中', key: 'commands.shortcuts.in.tables' },
  { id: 'collections-collections', tab: 'collections', title: '在合集中', key: 'commands.shortcuts.in.collections' },
] as const;

/** 本地已绑的键挂到哪一段（`null`＝该标签页无段，即「文档」）。 */
export const BINDING_SECTIONS: Readonly<Record<string, PanelSectionId | null>> = {
  TITLE: 'style-text',
  SUBTITLE: 'style-text',
  HEADING: 'style-text',
  STRONG: 'style-text',
  BODY: 'style-text',
  PAGE: 'style-text',
  CARD: 'style-text',
  FOCUS_DECOR: 'style-decorations',
  BLOCK_DECOR: 'style-decorations',
  TODO_LIST: 'style-list',
  TOGGLE_LIST: 'style-list',
  BULLET_LIST: 'style-list',
  NUMBERED_LIST: 'style-list',
  NO_LIST: 'style-list',
  TOGGLE_TOGGLES: 'editing-other',
  TABLE_CLEAR_CELL: 'collections-tables',
  TABLE_ROW_BEFORE: 'collections-tables',
  TABLE_ROW_AFTER: 'collections-tables',
  TABLE_COLUMN_BEFORE: 'collections-tables',
  SET_CANCELLED: 'tasks-global',
  SET_CANCELLED_SLASH: 'tasks-global',
  MOVE_BLOCK_UP: 'organize-move',
  MOVE_BLOCK_DOWN: 'organize-move',
  MOVE_BLOCK_TOP: 'organize-move',
  MOVE_BLOCK_BOTTOM: 'organize-move',
  MOVE_BLOCK_TOP_MAC: 'organize-move',
  MOVE_BLOCK_BOTTOM_MAC: 'organize-move',
  DUPLICATE: 'editing-selection',
  GROUP_BLOCKS: 'organize-group',
  STRIKE_INLINE: 'style-format',
  HIGHLIGHT_INLINE: 'style-format',
  CODE_INLINE: 'style-format',
  UNGROUP_BLOCKS: 'organize-group',
  RENAME: 'editing-selection',
  TOGGLE_LEFT_SIDEBAR: 'general-view',
  TOGGLE_FOCUS_MODE: 'general-view',
  TOGGLE_KEY_SHORTCUTS: 'general-view',
  OPEN_DAILY_NOTE: null,
  COMMENT: 'editing-comments',
  TOGGLE_QUICK_OPEN: 'general-navigation',
  TOGGLE_QUICK_OPEN_ALT: 'general-navigation',
  TOGGLE_QUICK_OPEN_SAFARI: 'general-navigation',
  FIND_IN_PAGE: 'editing-find-replace',
  FIND_NEXT: 'editing-find-replace',
  REPLACE_IN_PAGE: 'editing-find-replace',
  FIND_PREVIOUS: 'editing-find-replace',
} as const;

export interface PanelSectionRows extends PanelSection {
  rows: KeyBinding[];
}

export interface PanelTabView {
  tab: PanelTab;
  /** 「文档」这类无段标签页的行落在这里。 */
  unsectioned: KeyBinding[];
  sections: PanelSectionRows[];
}

export function tabOfSection(section: PanelSectionId | null): PanelTabId {
  if (section === null) return 'document';
  return PANEL_SECTIONS.find((entry) => entry.id === section)?.tab ?? 'document';
}

/** 把绑定表折成「标签页 → 段 → 行」，顺序全按官方分类与段序。 */
export function panelView(bindings: readonly KeyBinding[]): PanelTabView[] {
  return PANEL_TABS.map((tab) => {
    const owned = bindings.filter((binding) => tabOfSection(BINDING_SECTIONS[binding.id] ?? null) === tab.id);
    return {
      tab,
      unsectioned: owned.filter((binding) => (BINDING_SECTIONS[binding.id] ?? null) === null),
      sections: PANEL_SECTIONS.filter((section) => section.tab === tab.id).map((section) => ({
        ...section,
        rows: owned.filter((binding) => BINDING_SECTIONS[binding.id] === section.id),
      })),
    };
  });
}

/**
 * G784：方向键只挪**选中**，焦点留在原地——官方分类 rail 没有 roving tabindex，
 * 三者各走各的（选中跟随 Arrow、焦点跟随 Tab／程序焦点、激活跟随焦点，G782/G789）。
 * 所以这里只算"下一个选中项是谁"，绝不碰 `document.activeElement`。
 *
 * 顶/底边界官方未观测 ⇒ **夹住不循环**（不把未证的行为编成规格）。
 */
export function nextTabIndex(currentId: PanelTabId, delta: -1 | 1): PanelTabId {
  const index = PANEL_TABS.findIndex((tab) => tab.id === currentId);
  if (index < 0) return PANEL_TABS[0].id;
  const next = Math.min(PANEL_TABS.length - 1, Math.max(0, index + delta));
  return PANEL_TABS[next].id;
}
