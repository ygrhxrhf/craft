import type { EditorState, Transaction } from '@tiptap/pm/state';

import {
  alignPresence,
  clearListFormat,
  directionPresence,
  inlineMarkState,
  listPresence,
  type ListKind,
  type TriState,
  type WritingMode,
} from './format-presence';

/**
 * 「格式」页签的控件表。四条线各自成组，命名不再互相冒名（`gap.md` G153 记的就是本地把缩进
 * 放进 `alignButtons` 这件事）：
 *
 * - 对齐＝官方 `style.text.align` 五档（左/居中/右/两端 ＋ 默认），默认档写"无属性"；
 * - 缩进＝官方 `style.indent.in` / `style.indent.out`，与对齐是两回事；
 * - 列表＝官方 `style.list.*` 五档，取消列表格式是显式一档（G155）；
 * - 方向＝官方 `style.direction` 两轴（G1484），「从左到右」是缺省态。
 *
 * 每档的中文串带官方 i18n 键，由 `format-commands.test.ts` 逐条回查 `feature-catalog.md`，
 * 改一个字就会红。「默认」这一档语言包里没有独立键（五档里的它靠"清掉属性"表达），故 `key: null`。
 */

/**
 * 链式命令在表里只用到这几个方法；结构声明成子集，本表才能在没有编辑器时单测。
 * `focus` 用 `this` 返回，`chain().focus()` 之后才仍是 `FormatCommands`。
 */
export interface FormatChain {
  focus(): this;
  run(): unknown;
}

export interface FormatCommands extends FormatChain {
  setTextAlign(value: string): FormatChain;
  unsetTextAlign(): FormatChain;
  toggleBold(): FormatChain;
  toggleItalic(): FormatChain;
  toggleStrike(): FormatChain;
  toggleCode(): FormatChain;
  toggleTaskList(): FormatChain;
  setToggleBlock(): FormatChain;
  toggleBulletList(): FormatChain;
  toggleOrderedList(): FormatChain;
  liftListItem(type: string): FormatChain;
  sinkListItem(type: string): FormatChain;
  setWritingDirection(mode: WritingMode): FormatChain;
  setHeading(attributes: { level: number }): FormatChain;
  setCardBlock(attributes: Record<string, unknown>): FormatChain;
  setFocusStyle(color: string | null): FormatChain;
  setShadedStyle(color: string | null): FormatChain;
  setBlockFont(id: BlockFontId | null): FormatChain;
}

export interface FormatHost {
  chain(): FormatCommands;
  state: EditorState;
  dispatch: (tr: Transaction) => void;
}

export interface FormatControl {
  /** 官方 i18n 键；`null`＝官方语言包没有这一枚，中文串是本地词。 */
  key: string | null;
  label: string;
  apply: (host: FormatHost) => void;
}

export interface MarkControl extends FormatControl {
  mark: string;
}

export interface AlignControl extends FormatControl {
  /** `null`＝默认档（清掉 `textAlign` 属性）。 */
  value: string | null;
}

export interface ListControl extends FormatControl {
  kind: ListKind;
}

export interface DirectionControl extends FormatControl {
  mode: WritingMode;
}

/** 官方五档的取值顺序：四个具名档在前，默认档在末（面板上"清掉"总是最后一步）。 */
export const ALIGNMENT_CONTROLS: readonly AlignControl[] = [
  { key: 'style.text.align.left', label: '左对齐', value: 'left', apply: (h) => h.chain().focus().setTextAlign('left').run() },
  { key: 'style.text.align.center', label: '居中对齐', value: 'center', apply: (h) => h.chain().focus().setTextAlign('center').run() },
  { key: 'style.text.align.right', label: '右对齐', value: 'right', apply: (h) => h.chain().focus().setTextAlign('right').run() },
  { key: 'style.text.align.justify', label: '两端对齐', value: 'justify', apply: (h) => h.chain().focus().setTextAlign('justify').run() },
  { key: null, label: '默认', value: null, apply: (h) => h.chain().focus().unsetTextAlign().run() },
];

export const LIST_CONTROLS: readonly ListControl[] = [
  { kind: 'todo', key: 'style.list.todo', label: '待办列表', apply: (h) => h.chain().focus().toggleTaskList().run() },
  { kind: 'toggle', key: 'style.list.toggle', label: '折叠列表', apply: (h) => h.chain().focus().setToggleBlock().run() },
  { kind: 'bullet', key: 'style.list.bullet', label: '无序列表', apply: (h) => h.chain().focus().toggleBulletList().run() },
  { kind: 'numbered', key: 'style.list.numbered', label: '编号列表', apply: (h) => h.chain().focus().toggleOrderedList().run() },
  {
    kind: 'none',
    key: 'style.list.none',
    label: '取消列表格式',
    apply: (h) => {
      if (clearListFormat(h.state, h.dispatch)) h.chain().focus().run();
    },
  },
];

/** 缩进两档与对齐分开成组：官方 `indent.in`／`indent.out` 说的是层级，不是水平位置。 */
export const INDENT_CONTROLS: readonly FormatControl[] = [
  { key: 'style.indent.out', label: '减少缩进', apply: (h) => h.chain().focus().liftListItem('listItem').run() },
  { key: 'style.indent.in', label: '增加缩进', apply: (h) => h.chain().focus().sinkListItem('listItem').run() },
];

/**
 * 方向两档（`gap.md` G1484）。官方语言包里只有「从左到右」与「从上到下」这两枚，
 * 前者就是缺省态——所以这一族没有"清掉"的第三枚，点它＝把属性写回 `null`。
 */
export const DIRECTION_CONTROLS: readonly DirectionControl[] = [
  { mode: 'ltr', key: 'style.left.to.right', label: '从左到右', apply: (h) => h.chain().focus().setWritingDirection('ltr').run() },
  { mode: 'ttb', key: 'style.top.to.bottom', label: '从上到下', apply: (h) => h.chain().focus().setWritingDirection('ttb').run() },
];

export const INLINE_MARK_CONTROLS: readonly MarkControl[] = [
  { mark: 'bold', key: 'style.inline.bold', label: '粗体', apply: (h) => h.chain().focus().toggleBold().run() },
  { mark: 'italic', key: 'style.inline.italic', label: '斜体', apply: (h) => h.chain().focus().toggleItalic().run() },
  { mark: 'strike', key: 'style.inline.strike', label: '删除线', apply: (h) => h.chain().focus().toggleStrike().run() },
  { mark: 'code', key: 'style.inline.code', label: '代码', apply: (h) => h.chain().focus().toggleCode().run() },
];

/** 组标题：官方 `style.text.align`「对齐」、`style.indentation`「缩进」与 `style.direction`「方向」。列表族语言包只有逐档键，标题用本地词「列表」。 */
export const GROUP_KEYS = {
  align: 'style.text.align',
  alignLabel: '对齐',
  direction: 'style.direction',
  directionLabel: '方向',
  indent: 'style.indentation',
  indentLabel: '缩进',
  listLabel: '列表',
} as const;

/**
 * G208「分组（页面 / 卡片）」：官方把这两枚放在文本档位之后。本地「页面」沿用 G51 的语义——
 * 一篇页面就是文档标题样式（H1），「卡片」走已有的 `cardBlock` 容器。
 */
export const GROUPING_TITLE = { key: 'style.textstyles.groups', label: '分组' } as const;

export const GROUPING_CONTROLS: readonly FormatControl[] = [
  { key: 'style.text.page', label: '页面', apply: (h) => h.chain().focus().setHeading({ level: 1 }).run() },
  { key: 'style.text.card', label: '卡片', apply: (h) => h.chain().focus().setCardBlock({}).run() },
];

/** 装饰两族：焦点是左侧色条（`data-focus-color`），块是底色（`data-shaded-color`），两族共用七色。 */
export type DecorationKind = 'focus' | 'block';

export type DecorationColorName = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

export interface DecorationColor {
  kind: DecorationKind;
  color: DecorationColorName;
  label: string;
}

export const DECORATION_KEYS = {
  title: { key: 'style.decorations', label: '装饰' },
  focus: { key: 'style.decoration.focus', label: '焦点' },
  block: { key: 'style.decoration.block', label: '块' },
} as const;

const DECORATION_COLORS = [
  ['red', '红'],
  ['orange', '橙'],
  ['yellow', '黄'],
  ['green', '绿'],
  ['blue', '蓝'],
  ['purple', '紫'],
  ['pink', '粉'],
] as const;

export const DECORATION_SWATCHES: readonly DecorationColor[] = [
  ...DECORATION_COLORS.map(([color, label]) => ({ kind: 'focus' as const, color, label })),
  ...DECORATION_COLORS.map(([color, label]) => ({ kind: 'block' as const, color, label })),
];

/**
 * G208 的第三段：颜色之后是字体。官方 `style.font` 一族四档具名字体（System / Serif / Round /
 * Mono）＋「默认字体」清空档；本地沿用页面字体同样的四套栈，只是作用在选中块上。
 */
export type BlockFontId = 'system' | 'system-serif' | 'system-rounded' | 'system-mono';

export interface FontControl extends FormatControl {
  /** `null`＝清掉属性，回到默认字体。 */
  id: BlockFontId | null;
}

export const FONT_TITLE = { key: 'style.font', label: '字体' } as const;

export const FONT_CONTROLS: readonly FontControl[] = [
  { id: null, key: 'style.font.default', label: '默认字体', apply: (h) => h.chain().focus().setBlockFont(null).run() },
  { id: 'system', key: 'style.font.system', label: 'System', apply: (h) => h.chain().focus().setBlockFont('system').run() },
  { id: 'system-serif', key: 'style.font.serif', label: 'Serif', apply: (h) => h.chain().focus().setBlockFont('system-serif').run() },
  { id: 'system-rounded', key: 'style.font.round', label: 'Round', apply: (h) => h.chain().focus().setBlockFont('system-rounded').run() },
  { id: 'system-mono', key: 'style.font.mono', label: 'Mono', apply: (h) => h.chain().focus().setBlockFont('system-mono').run() },
];

/** 三类属性挂在同一批块类型上（与 FocusStyle / ShadedStyle / BlockFont 一致）。 */
export const DECORATED_TYPES = [
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'bulletList',
  'orderedList',
  'taskList',
  'callout',
  'toggleBlock',
  'cardBlock',
] as const;

/** 装饰档的落笔：焦点走 `setFocusStyle`，块走 `setShadedStyle`；`null` 即清除。 */
export function applyDecoration(host: FormatHost, kind: DecorationKind, color: DecorationColorName | null): void {
  const chain = host.chain().focus();
  if (kind === 'focus') chain.setFocusStyle(color).run();
  else chain.setShadedStyle(color).run();
}

export interface BlockDecorationState {
  focus: string | null;
  block: string | null;
  font: BlockFontId | null;
}

/** 选区起点所在块的装饰与字体；没有装饰属性时为全 `null`。 */
export function decorationAt(state: EditorState): BlockDecorationState {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if ((DECORATED_TYPES as readonly string[]).includes(node.type.name)) {
      return {
        focus: (node.attrs.focusColor as string | null) ?? null,
        block: (node.attrs.shadedColor as string | null) ?? null,
        font: (node.attrs.blockFont as BlockFontId | null) ?? null,
      };
    }
  }
  return { focus: null, block: null, font: null };
}

/** 分组档是否点亮：卡片容器优先，其次是页面标题（H1）。 */
export function groupingAt(state: EditorState): 'page' | 'card' | null {
  const { $from } = state.selection;
  let page = false;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === 'cardBlock') return 'card';
    if (node.type.name === 'heading' && node.attrs.level === 1) page = true;
  }
  return page ? 'page' : null;
}

export function markState(state: EditorState, mark: string): TriState {
  return inlineMarkState(state, mark);
}

/**
 * 对齐档是否点亮。混合时**没有任何一档点亮**——这正是官方「混合」的语义：控件不替用户挑第一个值。
 */
export function alignState(state: EditorState, value: string | null): boolean {
  const presence = alignPresence(state.doc, state.selection.from, state.selection.to);
  return !presence.mixed && presence.value === value;
}

export function alignMixed(state: EditorState): boolean {
  return alignPresence(state.doc, state.selection.from, state.selection.to).mixed;
}

export function listState(state: EditorState, kind: ListKind): boolean {
  const presence = listPresence(state.doc, state.selection.from, state.selection.to);
  return !presence.mixed && presence.kind === kind;
}

export function listMixed(state: EditorState): boolean {
  return listPresence(state.doc, state.selection.from, state.selection.to).mixed;
}

export function directionState(state: EditorState, mode: WritingMode): boolean {
  const presence = directionPresence(state.doc, state.selection.from, state.selection.to);
  return !presence.mixed && presence.mode === mode;
}

export function directionMixed(state: EditorState): boolean {
  return directionPresence(state.doc, state.selection.from, state.selection.to).mixed;
}
