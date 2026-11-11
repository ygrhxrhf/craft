/**
 * 官方快捷键面板的完整名册（G755 / G771）—— 89 行主行 ＋ 6 条「或者」别名行，
 * 逐行取自 `keyboard.md` §十二（第 82 批对账表，键帽数已与 `_harvest/b81-panel-all.txt`
 * 的 kbd 字段逐一相等：16／11／34／27／80／13／38 ＝ 219）与 §14.2（合集段逐行）。
 *
 * 面板按这份名册渲染：本机接线的行走本机键帽，没接的行也照列，用官方键帽置灰加
 * 「未接入」——用户能看到官方有、本地暂缺的组合（第 1 批裁决），而不是把它们裁掉。
 * `bound` 三种取值：
 * - `KEY_BINDINGS` 的 id ⇒ 该行由编辑器 keymap 直接分发，键帽按本机实际打印；
 * - 接线标记（`task-row` 等）⇒ 键生效但不在 keymap 表里，按官方键帽打印；
 * - `null` ⇒ 本机无接线证据，置灰。
 *
 * 别名行（`alt`）是同一条命令的第二键位，官方单独占一行（`_rowAlternative_`），
 * 这里也单独渲染；`alt.bound` 标记第二串本机是否生效。
 */

import { KEY_BINDINGS, capParts, type KeyBinding, type Platform } from './keymap';
import { BINDING_SECTIONS, PANEL_SECTIONS, PANEL_TABS, tabOfSection, type PanelSectionId, type PanelTab, type PanelTabId } from './shortcut-panel';

export interface OfficialRow {
  label: string;
  /** 官方 Windows 显示串的逐枚键帽；本机已绑时渲染层改用本机键帽。 */
  keys: string[];
  tab: PanelTabId;
  /** `null` ＝ 行挂在分类标题下（「通用」前两行与「文档」全段没有 H3）。 */
  section: PanelSectionId | null;
  bound: string | null;
  /** 这一行只在列出的平台上算接线（G746：Mac 无从实测的行在 Mac 面板上仍是「未接入」）。 */
  boundPlatforms?: readonly Platform[];
  /** 第二键位（官方那句 `或者`）；`bound` 与主行同语义：keymap id／接线标记／`null`。 */
  alt?: { keys: string[]; bound: string | null };
  /** G746：只在 Mac 面板上出现的第二键位（官方 `Ll ? [COMMON, MAC] : [COMMON]`）。 */
  macAlt?: { keys: string[]; bound: string | null };
}

/** G746 ②⑤：官方的两组「Mac 才加印第二条」映射（`tasks.mark.task.as.cancelled` 与装配器 `S9t`）。 */
const MAC_ALT_BINDINGS: Readonly<Record<string, string>> = {
  SET_CANCELLED: 'SET_CANCELLED_SLASH',
  MOVE_BLOCK_TOP: 'MOVE_BLOCK_TOP_MAC',
  MOVE_BLOCK_BOTTOM: 'MOVE_BLOCK_BOTTOM_MAC',
};

/** G746 ①：快速开启在 Safari 上的主键位（官方 `Hd ? [SAFARI, ALT] : [QUICK_OPEN, ALT]`）。 */
const SAFARI_MAIN_BINDING: Readonly<Record<string, string>> = {
  TOGGLE_QUICK_OPEN: 'TOGGLE_QUICK_OPEN_SAFARI',
};

/** 面板读的是哪一套浏览器键位；`safari` 只换「快速开启」的展示，分发不看它（G1589）。 */
export type PanelBrowser = 'safari' | 'other';

/** G746 ①：快速开启的两条弦互斥出现——Safari 图不印 ⌘O，其余浏览器图不印 ⌘⇧O。 */
const SAFARI_PRUNED: Readonly<Record<string, (browser: PanelBrowser) => boolean>> = {
  TOGGLE_QUICK_OPEN: (browser) => browser === 'safari',
  TOGGLE_QUICK_OPEN_SAFARI: (browser) => browser !== 'safari',
};

/**
 * 接线标记：键生效、但分发点不在 `KEY_BINDINGS` 表里。
 * `select-edge` 是 G1599 的接管点（`select-to-edge.ts`）：官方实测 Ctrl-Shift-↑/↓ 与
 * Ctrl-Shift-Home/End 都不扩选，本机同样拦下，所以 Windows 面板那两行算已接入。
 */
export const OFFICIAL_WIRING = new Set([
  'task-row',
  'new-task',
  'pm-default',
  'editor-slash',
  'space-insert',
  'table-axis',
  'select-edge',
]);

export const OFFICIAL_ROWS: readonly OfficialRow[] = [
  // 通用（7 行 ＋ 快速开启 1 别名；16 枚键帽）
  { label: '取消', keys: ['esc'], tab: 'general', section: null, bound: null },
  { label: '查看所有快捷键', keys: ['Ctrl', 'Shift', ','], tab: 'general', section: null, bound: 'TOGGLE_KEY_SHORTCUTS' },
  { label: '导航到', keys: ['Ctrl', '→'], tab: 'general', section: 'general-navigation', bound: 'NAVIGATE_INTO' },
  { label: '返回上层', keys: ['Ctrl', '←'], tab: 'general', section: 'general-navigation', bound: 'NAVIGATE_OUT' },
  { label: '快速开启', keys: ['Ctrl', 'O'], tab: 'general', section: 'general-navigation', bound: 'TOGGLE_QUICK_OPEN', alt: { keys: ['Ctrl', 'P'], bound: 'TOGGLE_QUICK_OPEN_ALT' } },
  { label: '切换专注模式', keys: ['Ctrl', '.'], tab: 'general', section: 'general-view', bound: 'TOGGLE_FOCUS_MODE' },
  { label: '切换左侧边栏', keys: ['Ctrl', '\\'], tab: 'general', section: 'general-view', bound: 'TOGGLE_LEFT_SIDEBAR' },

  // 文档（4 行，无段标题；11 枚键帽）
  { label: '每日笔记', keys: ['Ctrl', 'Alt', 'N'], tab: 'document', section: null, bound: 'OPEN_DAILY_NOTE' },
  { label: '全选', keys: ['Ctrl', 'A'], tab: 'document', section: null, bound: 'pm-default' },
  { label: '选择到顶部', keys: ['Ctrl', 'Shift', '⤒'], tab: 'document', section: null, bound: 'select-edge', boundPlatforms: ['win'], macAlt: { keys: ['⌘', '⇧', '↑'], bound: null } },
  { label: '选择到底部', keys: ['Ctrl', 'Shift', '⤓'], tab: 'document', section: null, bound: 'select-edge', boundPlatforms: ['win'], macAlt: { keys: ['⌘', '⇧', '↓'], bound: null } },

  // 任务（15 行 ＋ 已完成/删除 2 别名；34 枚键帽）
  { label: '新任务', keys: ['Ctrl', 'J'], tab: 'tasks', section: 'tasks-global', bound: 'new-task' },
  { label: '将任务标记为已完成', keys: ['Ctrl', 'Alt', 'T'], tab: 'tasks', section: 'tasks-global', bound: 'task-row', alt: { keys: ['Ctrl', '/'], bound: 'task-row' } },
  { label: '将任务标记为已取消', keys: ['Ctrl', 'Alt', 'Shift', 'T'], tab: 'tasks', section: 'tasks-global', bound: 'SET_CANCELLED' },
  { label: '计划任务', keys: ['Ctrl', 'Shift', 'S'], tab: 'tasks', section: 'tasks-global', bound: 'task-row' },
  { label: '安排到今天', keys: ['Ctrl', 'Alt', 'S'], tab: 'tasks', section: 'tasks-global', bound: 'task-row' },
  { label: '设定截止日期', keys: ['Ctrl', 'Shift', 'D'], tab: 'tasks', section: 'tasks-global', bound: 'task-row' },
  { label: '编辑任务', keys: ['⏎'], tab: 'tasks', section: 'tasks-views', bound: null },
  { label: '导航至区块', keys: ['Ctrl', '→'], tab: 'tasks', section: 'tasks-views', bound: null },
  { label: '上一个任务', keys: ['↑'], tab: 'tasks', section: 'tasks-views', bound: null },
  { label: '下一个任务', keys: ['↓'], tab: 'tasks', section: 'tasks-views', bound: null },
  { label: '收起分组', keys: ['←'], tab: 'tasks', section: 'tasks-views', bound: null },
  { label: '展开分组', keys: ['→'], tab: 'tasks', section: 'tasks-views', bound: null },
  { label: '删除', keys: ['⌫'], tab: 'tasks', section: 'tasks-views', bound: null, alt: { keys: ['Delete'], bound: null } },
  { label: '撤销', keys: ['Ctrl', 'Z'], tab: 'tasks', section: 'tasks-views', bound: null },
  { label: '重做', keys: ['Ctrl', 'Shift', 'Z'], tab: 'tasks', section: 'tasks-views', bound: null },

  // 编辑（13 行 ＋ 已完成无；27 枚键帽）
  { label: '查找', keys: ['Ctrl', 'F'], tab: 'editing', section: null, bound: 'FIND_IN_PAGE' },
  { label: '查找和替换', keys: ['Ctrl', 'Shift', 'F'], tab: 'editing', section: null, bound: 'REPLACE_IN_PAGE' },
  { label: '在下方插入新区块', keys: ['space'], tab: 'editing', section: 'editing-insert', bound: 'space-insert' },
  { label: '在上方插入新区块', keys: ['Shift', 'space'], tab: 'editing', section: 'editing-insert', bound: null },
  { label: '编辑文本区块', keys: ['⏎'], tab: 'editing', section: 'editing-selection', bound: null },
  { label: '编辑页面区块', keys: ['Shift', '⏎'], tab: 'editing', section: 'editing-selection', bound: 'RENAME' },
  { label: '创建副本', keys: ['Ctrl', 'D'], tab: 'editing', section: 'editing-selection', bound: 'DUPLICATE' },
  { label: '打开斜线菜单', keys: ['/'], tab: 'editing', section: 'editing-selection', bound: 'editor-slash' },
  { label: '添加或查看评论', keys: ['Ctrl', 'Shift', 'M'], tab: 'editing', section: 'editing-comments', bound: 'COMMENT' },
  { label: '查找下一个', keys: ['Ctrl', 'G'], tab: 'editing', section: 'editing-find-replace', bound: 'FIND_NEXT' },
  { label: '查找上一个', keys: ['Ctrl', 'Shift', 'G'], tab: 'editing', section: 'editing-find-replace', bound: 'FIND_PREVIOUS' },
  { label: '撤销', keys: ['Ctrl', 'Z'], tab: 'editing', section: 'editing-other', bound: 'pm-default' },
  { label: '重做', keys: ['Ctrl', 'Shift', 'Z'], tab: 'editing', section: 'editing-other', bound: 'pm-default' },

  // 样式（27 行 ＋ 已完成/代码 2 别名；80 枚键帽）
  { label: '标题', keys: ['Ctrl', 'Shift', '1'], tab: 'style', section: 'style-text', bound: 'TITLE' },
  { label: '副标题', keys: ['Ctrl', 'Shift', '2'], tab: 'style', section: 'style-text', bound: 'SUBTITLE' },
  { label: '中标题', keys: ['Ctrl', 'Shift', '3'], tab: 'style', section: 'style-text', bound: 'HEADING' },
  { label: '粗', keys: ['Ctrl', 'Shift', '4'], tab: 'style', section: 'style-text', bound: 'STRONG' },
  { label: '正文', keys: ['Ctrl', 'Shift', '5'], tab: 'style', section: 'style-text', bound: 'BODY' },
  { label: '页面', keys: ['Ctrl', 'Shift', 'P'], tab: 'style', section: 'style-text', bound: 'PAGE' },
  { label: '卡片', keys: ['Ctrl', 'Shift', 'L'], tab: 'style', section: 'style-text', bound: 'CARD' },
  { label: '待办列表', keys: ['Ctrl', 'Shift', '6'], tab: 'style', section: 'style-list', bound: 'TODO_LIST' },
  { label: '将任务标记为已完成', keys: ['Ctrl', 'Alt', 'T'], tab: 'style', section: 'style-list', bound: 'task-row', alt: { keys: ['Ctrl', '/'], bound: 'task-row' } },
  { label: '将任务标记为已取消', keys: ['Ctrl', 'Alt', 'Shift', 'T'], tab: 'style', section: 'style-list', bound: 'SET_CANCELLED' },
  { label: '折叠列表', keys: ['Ctrl', 'Shift', '7'], tab: 'style', section: 'style-list', bound: 'TOGGLE_LIST' },
  { label: '打开/关闭切换', keys: ['Ctrl', 'Alt', 'T'], tab: 'style', section: 'style-list', bound: 'TOGGLE_TOGGLES' },
  { label: '无序列表', keys: ['Ctrl', 'Shift', '8'], tab: 'style', section: 'style-list', bound: 'BULLET_LIST' },
  { label: '编号列表', keys: ['Ctrl', 'Shift', '9'], tab: 'style', section: 'style-list', bound: 'NUMBERED_LIST' },
  { label: '取消列表格式', keys: ['Ctrl', 'Shift', '`'], tab: 'style', section: 'style-list', bound: 'NO_LIST' },
  { label: '焦点', keys: ['Ctrl', 'Shift', '\\'], tab: 'style', section: 'style-decorations', bound: 'FOCUS_DECOR' },
  { label: '块', keys: ["Ctrl", 'Shift', "'"], tab: 'style', section: 'style-decorations', bound: 'BLOCK_DECOR' },
  { label: '增加缩进', keys: ['Tab'], tab: 'style', section: 'style-indentation', bound: null },
  { label: '减少缩进', keys: ['Shift', 'Tab'], tab: 'style', section: 'style-indentation', bound: null },
  { label: '粗体', keys: ['Ctrl', 'B'], tab: 'style', section: 'style-format', bound: 'pm-default' },
  { label: '斜体', keys: ['Ctrl', 'I'], tab: 'style', section: 'style-format', bound: 'pm-default' },
  { label: '代码', keys: ['Ctrl', 'Shift', 'C'], tab: 'style', section: 'style-format', bound: 'CODE_INLINE', alt: { keys: ['Ctrl', 'E'], bound: null } },
  { label: '删除线', keys: ['Ctrl', 'Shift', '-'], tab: 'style', section: 'style-format', bound: 'STRIKE_INLINE' },
  { label: '链接', keys: ['Ctrl', 'K'], tab: 'style', section: 'style-format', bound: null },
  { label: '输入方程', keys: ['Ctrl', 'Shift', 'E'], tab: 'style', section: 'style-format', bound: null },
  { label: '区块链接', keys: ['Ctrl', 'Shift', 'K'], tab: 'style', section: 'style-format', bound: null },
  { label: '高亮', keys: ['Ctrl', 'Shift', 'B'], tab: 'style', section: 'style-format', bound: 'HIGHLIGHT_INLINE' },

  // 整理（6 行；13 枚键帽）
  { label: '向上移动', keys: ['Alt', '↑'], tab: 'organize', section: 'organize-move', bound: 'MOVE_BLOCK_UP' },
  { label: '向下移动', keys: ['Alt', '↓'], tab: 'organize', section: 'organize-move', bound: 'MOVE_BLOCK_DOWN' },
  { label: '移动到顶部', keys: ['Alt', '⤒'], tab: 'organize', section: 'organize-move', bound: 'MOVE_BLOCK_TOP' },
  { label: '移动到底部', keys: ['Alt', '⤓'], tab: 'organize', section: 'organize-move', bound: 'MOVE_BLOCK_BOTTOM' },
  { label: '组合', keys: ['Ctrl', 'G'], tab: 'organize', section: 'organize-group', bound: 'GROUP_BLOCKS' },
  { label: '取消组合', keys: ['Ctrl', 'Shift', 'G'], tab: 'organize', section: 'organize-group', bound: 'UNGROUP_BLOCKS' },

  // 合集（17 行 ＋ 添加一行 1 别名；38 枚键帽）
  { label: '清除单元格内容', keys: ['⌫'], tab: 'collections', section: 'collections-tables', bound: 'TABLE_CLEAR_CELL' },
  { label: '在前面添加行', keys: ['Ctrl', 'Shift', '⏎'], tab: 'collections', section: 'collections-tables', bound: 'TABLE_ROW_BEFORE' },
  { label: '添加行', keys: ['Ctrl', '⏎'], tab: 'collections', section: 'collections-tables', bound: 'TABLE_ROW_AFTER' },
  { label: '在前面添加列', keys: ['Ctrl', 'Alt', '⏎'], tab: 'collections', section: 'collections-tables', bound: 'TABLE_COLUMN_BEFORE' },
  { label: '添加列', keys: ['Ctrl', 'Shift', '⏎'], tab: 'collections', section: 'collections-tables', bound: 'table-axis' },
  { label: '向上移动行', keys: ['Alt', '↑'], tab: 'collections', section: 'collections-tables', bound: null },
  { label: '向下移动行', keys: ['Alt', '↓'], tab: 'collections', section: 'collections-tables', bound: null },
  { label: '向左移动列', keys: ['Alt', '←'], tab: 'collections', section: 'collections-tables', bound: null },
  { label: '向右移动列', keys: ['Alt', '→'], tab: 'collections', section: 'collections-tables', bound: null },
  { label: '删除行', keys: ['Ctrl', '⌫'], tab: 'collections', section: 'collections-tables', bound: null },
  { label: '删除列', keys: ['Ctrl', 'Shift', '⌫'], tab: 'collections', section: 'collections-tables', bound: null },
  { label: '添加内容', keys: ['Ctrl', '['], tab: 'collections', section: 'collections-tables', bound: null },
  { label: '添加一行', keys: ['Ctrl', '⏎'], tab: 'collections', section: 'collections-collections', bound: null, alt: { keys: ['Shift', '⏎'], bound: null } },
  { label: '复制行', keys: ['Ctrl', 'D'], tab: 'collections', section: 'collections-collections', bound: null },
  { label: '选择所有行', keys: ['Ctrl', 'A'], tab: 'collections', section: 'collections-collections', bound: null },
  { label: '清除单元格值', keys: ['⌫'], tab: 'collections', section: 'collections-collections', bound: null },
  { label: '删除行', keys: ['Ctrl', '⌫'], tab: 'collections', section: 'collections-collections', bound: null },
];

export interface RosterAlt {
  /** 逐枚键帽（渲染成 `<kbd>`）。 */
  caps: string[];
  /** 有前缀「还是」的第二串＝官方那句 `或者`。 */
  conjunction: '或者';
  unbound: boolean;
}

export interface RosterRow {
  /** React key；官方行带 `o-` 前缀，本地补渲染行带 `l-`。 */
  id: string;
  label: string;
  /** `false` ＝官方名册没有、由本地绑定补渲染的行。 */
  official: boolean;
  /** `true` ＝置灰并标「未接入」（官方行）或「本机未绑」（本地补渲染行）。 */
  unbound: boolean;
  /** 主行键帽：keymap 已绑行走本机实际键位，其余走官方键帽。 */
  caps: string[];
  emptyTag: '未接入' | '本机未绑' | null;
  alt?: RosterAlt;
}

export interface RosterSection {
  section: PanelSection;
  rows: RosterRow[];
}

export interface RosterTab {
  tab: PanelTab;
  /** 没有段标题的行（「通用」前两行、「文档」全段、「编辑」查找两行）。 */
  unsectioned: RosterRow[];
  sections: RosterSection[];
}

type PanelSection = (typeof PANEL_SECTIONS)[number];

function toRosterRow(
  row: OfficialRow,
  key: string,
  bindings: ReadonlyMap<string, KeyBinding>,
  platform: Platform,
  browser: PanelBrowser,
): RosterRow {
  const derivedMacAlt = platform === 'mac' && row.bound ? MAC_ALT_BINDINGS[row.bound] : undefined;
  const alt = row.alt
    ? altView(row.alt, bindings, platform)
    : row.macAlt && platform === 'mac'
      ? altView(row.macAlt, bindings, platform)
      : derivedMacAlt
        ? altFromBinding(derivedMacAlt, bindings, platform)
        : undefined;
  const main = row.bound && browser === 'safari' ? (SAFARI_MAIN_BINDING[row.bound] ?? row.bound) : row.bound;
  const mainPlatformOk = !row.boundPlatforms || row.boundPlatforms.includes(platform);
  if (main && mainPlatformOk && OFFICIAL_WIRING.has(main)) {
    return { id: key, label: row.label, official: true, unbound: false, caps: row.keys, emptyTag: null, alt };
  }
  if (main && mainPlatformOk) {
    const caps = capParts(bindings.get(main)!, platform);
    return {
      id: key,
      label: row.label,
      official: true,
      unbound: caps.length === 0,
      caps: caps.length > 0 ? caps : row.keys,
      emptyTag: caps.length > 0 ? null : '本机未绑',
      alt,
    };
  }
  return { id: key, label: row.label, official: true, unbound: true, caps: row.keys, emptyTag: '未接入', alt };
}

function altView(
  alt: NonNullable<OfficialRow['alt']>,
  bindings: ReadonlyMap<string, KeyBinding>,
  platform: Platform,
): RosterAlt {
  const unbound =
    alt.bound === null
      ? true
      : OFFICIAL_WIRING.has(alt.bound)
        ? false
        : capParts(bindings.get(alt.bound)!, platform).length === 0;
  return { caps: alt.keys, conjunction: '或者', unbound };
}

/** G746：`_MAC` 变体的键帽按 Mac 实绑打印（`capParts` 对 `win: null` 给空 ⇒ 该行在 Win 不出现）。 */
function altFromBinding(bindingId: string, bindings: ReadonlyMap<string, KeyBinding>, platform: Platform): RosterAlt {
  const caps = capParts(bindings.get(bindingId)!, platform);
  return { caps: caps.length > 0 ? caps : [], conjunction: '或者', unbound: caps.length === 0 };
}

/**
 * 面板的最终形状：官方名册 89 行按分类／段排好，再把名册没覆盖的本地绑定
 * （Mac 专用与 Safari 键位那几条）按原分区补进去——本地已绑的行一条都不消失。
 *
 * G746：`platform` 与 `browser` 决定**展示层**裁条目（官方四类条件写法）。`browser` 只影响
 * 「快速开启」主键位；分发不看浏览器（G1589 实测 Chrome 上三弦都开面板）。
 */
export function panelRoster(platform: Platform, browser: PanelBrowser = 'other'): RosterTab[] {
  const bindings = new Map(KEY_BINDINGS.map((binding) => [binding.id, binding]));
  const consumed = new Set(
    OFFICIAL_ROWS.flatMap((row) => {
      const main =
        row.bound && browser === 'safari' ? (SAFARI_MAIN_BINDING[row.bound] ?? row.bound) : row.bound;
      const macDerived = platform === 'mac' && row.bound ? MAC_ALT_BINDINGS[row.bound] : undefined;
      return [main, row.alt?.bound, row.macAlt?.bound, macDerived];
    }).filter((id): id is string => Boolean(id) && !OFFICIAL_WIRING.has(id!)),
  );

  return PANEL_TABS.map((tab) => {
    const official: Array<{ section: PanelSectionId | null; view: RosterRow }> = OFFICIAL_ROWS
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.tab === tab.id)
      .map(({ row, index }) => ({ section: row.section, view: toRosterRow(row, `o-${tab.id}-${index}`, bindings, platform, browser) }));

    const leftover: Array<{ section: PanelSectionId | null; view: RosterRow }> = KEY_BINDINGS
      .filter((binding) => !consumed.has(binding.id) && tabOfSection(BINDING_SECTIONS[binding.id] ?? null) === tab.id)
      // G746 ①：快速开启的另一条弦只在对面的浏览器图上印（Safari 印 `_SAFARI`，其余印 `_QUICK_OPEN`）。
      .filter((binding) => !SAFARI_PRUNED[binding.id]?.(browser))
      // 本机这一侧没有键帽的绑定（`win: null` 的 Mac 专用项）不印——官方同样按平台裁。
      .filter((binding) => capParts(binding, platform).length > 0)
      .map((binding) => {
        const caps = capParts(binding, platform);
        return {
          section: BINDING_SECTIONS[binding.id] ?? null,
          view: {
            id: `l-${binding.id}`,
            label: binding.label,
            official: false,
            unbound: caps.length === 0,
            caps,
            emptyTag: caps.length > 0 ? null : '本机未绑',
          } satisfies RosterRow,
        };
      });

    const entries = official.concat(leftover);
    return {
      tab,
      unsectioned: entries.filter((entry) => entry.section === null).map((entry) => entry.view),
      sections: PANEL_SECTIONS.filter((section) => section.tab === tab.id).map((section) => ({
        section,
        rows: entries.filter((entry) => entry.section === section.id).map((entry) => entry.view),
      })),
    };
  });
}
