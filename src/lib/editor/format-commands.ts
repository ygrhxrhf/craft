import type { EditorState, Transaction } from '@tiptap/pm/state';

import {
  alignPresence,
  clearListFormat,
  inlineMarkState,
  listPresence,
  type ListKind,
  type TriState,
} from './format-presence';

/**
 * 「格式」页签的控件表。三条线各自成组，命名不再互相冒名（`gap.md` G153 记的就是本地把缩进
 * 放进 `alignButtons` 这件事）：
 *
 * - 对齐＝官方 `style.text.align` 五档（左/居中/右/两端 ＋ 默认），默认档写"无属性"；
 * - 缩进＝官方 `style.indent.in` / `style.indent.out`，与对齐是两回事；
 * - 列表＝官方 `style.list.*` 五档，取消列表格式是显式一档（G155）。
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

export const INLINE_MARK_CONTROLS: readonly MarkControl[] = [
  { mark: 'bold', key: 'style.inline.bold', label: '粗体', apply: (h) => h.chain().focus().toggleBold().run() },
  { mark: 'italic', key: 'style.inline.italic', label: '斜体', apply: (h) => h.chain().focus().toggleItalic().run() },
  { mark: 'strike', key: 'style.inline.strike', label: '删除线', apply: (h) => h.chain().focus().toggleStrike().run() },
  { mark: 'code', key: 'style.inline.code', label: '代码', apply: (h) => h.chain().focus().toggleCode().run() },
];

/** 组标题：官方 `style.text.align`「对齐」与 `style.indentation`「缩进」。列表族语言包只有逐档键，标题用本地词「列表」。 */
export const GROUP_KEYS = {
  align: 'style.text.align',
  alignLabel: '对齐',
  indent: 'style.indentation',
  indentLabel: '缩进',
  listLabel: '列表',
} as const;

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
