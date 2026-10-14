import { NodeRange, type Node } from '@tiptap/pm/model';
import { liftTarget } from '@tiptap/pm/transform';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { TOGGLE_NODE } from '@/components/editor/extensions/toggle-all';

/**
 * 官方样式面板的三态指示（`style.mixed`「混合」）：选区里的格式不一致时，控件既不高亮任何一档、
 * 也不取第一个值，而是显示「混合」（`gap.md` G154）。列表族显式带「取消列表格式」这一档
 * （`style.list.none`，与官方 `ListStyle` 5 档互证，G155），对齐族带「默认」这一档（G153）。
 *
 * 本模块只做 ProseMirror 文档层上的判定，不碰编辑器实例也不碰 DOM，所以每条判据都能直接单测。
 */

/** `on`＝选区全体带该格式，`off`＝全体都不带，`mixed`＝部分带（官方显示「混合」）。 */
export type TriState = 'off' | 'on' | 'mixed';

/** 官方逐字串：`style.mixed`。 */
export const MIXED_LABEL = '混合';

/**
 * `TextAlign` 能落属性的块类型。真源在 `Editor.tsx` 的 configure 里，这里只有一份，
 * 判定与配置必须读同一个数组，否则面板会显示一个正文里写不进去的档位。
 */
export const ALIGNABLE_TYPES = ['heading', 'paragraph'];

/** 官方列表族的五档词汇（`style.list.{none,todo,toggle,bullet,numbered}`）。 */
export type ListKind = 'none' | 'todo' | 'toggle' | 'bullet' | 'numbered';
export const LIST_KINDS: readonly ListKind[] = ['none', 'todo', 'toggle', 'bullet', 'numbered'];

/**
 * 官方 `style.direction`「方向」的两轴（`gap.md` G1484）：`style.left.to.right`「从左到右」
 * 与 `style.top.to.bottom`「从上到下」。语言包里**只有这两枚**，没有第三个方向档，
 * 所以「从左到右」就是缺省态——正如对齐族里的「默认」靠"清掉属性"表达。
 */
export type WritingMode = 'ltr' | 'ttb';
export const WRITING_MODES: readonly WritingMode[] = ['ltr', 'ttb'];

/** 落到 CSS 的写法；`ltr`＝不写属性（横排本来就是初值）。 */
export const CSS_WRITING_MODE: Record<WritingMode, string | null> = { ltr: null, ttb: 'vertical-rl' };

/** `parseHTML` 认回来的只有这一枚具名档；其余（含 `horizontal-tb` 与缺省）都归 `ltr`。 */
const WRITING_MODE_BY_CSS: Record<string, WritingMode> = { 'vertical-rl': 'ttb' };

export function writingModeFromCss(value: string | null | undefined): WritingMode {
  return WRITING_MODE_BY_CSS[(value ?? '').trim().toLowerCase()] ?? 'ltr';
}

/** 选区里可定向块实际用到的方向档，按文档序去重（缺属性＝`ltr`＝官方那枚「从左到右」）。 */
export function directionValues(
  doc: EditorState['doc'],
  from: number,
  to: number = from,
  typeNames: readonly string[] = ALIGNABLE_TYPES,
): WritingMode[] {
  const read = (node: Node) => (node.attrs.writingDirection as WritingMode | null) ?? 'ltr';
  if (to <= from) {
    const parent = doc.resolve(from).parent;
    if (!typeNames.includes(parent.type.name)) return [];
    return [read(parent)];
  }
  const seen: WritingMode[] = [];
  doc.nodesBetween(from, to, (node) => {
    if (!typeNames.includes(node.type.name)) return;
    const mode = read(node);
    if (!seen.includes(mode)) seen.push(mode);
  });
  return seen;
}

export interface DirectionPresence {
  mode: WritingMode | null;
  mixed: boolean;
  /** 选区里没有任何可定向的块。 */
  empty: boolean;
}

/** 方向控件该显示哪一档：两档里的单一档、跨档＝混合、还是没有可定向的块。`to` 省略＝光标（`from`）。 */
export function directionPresence(doc: EditorState['doc'], from: number, to: number = from): DirectionPresence {
  const modes = directionValues(doc, from, to);
  if (!modes.length) return { mode: null, mixed: false, empty: true };
  if (modes.length > 1) return { mode: null, mixed: true, empty: false };
  return { mode: modes[0], mixed: false, empty: false };
}

const WRAPPER_KINDS: Record<string, ListKind> = {
  bulletList: 'bullet',
  orderedList: 'numbered',
  taskList: 'todo',
};

/** 「取消列表格式」要把块从中拔出来的那些容器：列表的包装节点＋列表项本身＋折叠块。 */
const REMOVABLE = new Set(['listItem', 'taskItem', TOGGLE_NODE]);

export interface MarkPresence {
  marked: number;
  total: number;
}

/** 选区 `[from, to)` 里带 `markName` 的字符数与总字符数（空选区与跨节点选区都记 0 字）。 */
export function markPresence(doc: EditorState['doc'], from: number, to: number, markName: string): MarkPresence {
  if (to <= from) return { marked: 0, total: 0 };
  let marked = 0;
  let total = 0;
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return;
    const length = Math.min(pos + node.nodeSize, to) - Math.max(pos, from);
    if (length <= 0) return;
    total += length;
    if (node.marks.some((mark) => mark.type.name === markName)) marked += length;
  });
  return { marked, total };
}

/**
 * 选区上的三态。空选区（`to <= from`）没有"不一致"可言，一律 `off`——光标处的格式请走
 * {@link inlineMarkState}，它读存态。
 */
export function markTriState(doc: EditorState['doc'], from: number, to: number, markName: string): TriState {
  const { marked, total } = markPresence(doc, from, to, markName);
  if (total === 0 || marked === 0) return 'off';
  return marked === total ? 'on' : 'mixed';
}

/** 行内格式控件的三态：有选区按字符数判，空选区读存态（光标处的格式）。 */
export function inlineMarkState(state: EditorState, markName: string): TriState {
  const { from, to, $from } = state.selection;
  if (to > from) return markTriState(state.doc, from, to, markName);
  const marks = state.storedMarks ?? $from.marks();
  return marks.some((mark) => mark.type.name === markName) ? 'on' : 'off';
}

/** 选区里可对齐块实际用到的 `textAlign` 值，按文档序去重（缺属性＝`null`＝默认档）。 */
export function alignValues(
  doc: EditorState['doc'],
  from: number,
  to: number,
  typeNames: readonly string[] = ALIGNABLE_TYPES,
): (string | null)[] {
  if (to <= from) {
    const parent = doc.resolve(from).parent;
    if (!typeNames.includes(parent.type.name)) return [];
    return [parent.attrs.textAlign ?? null];
  }
  const seen: (string | null)[] = [];
  doc.nodesBetween(from, to, (node) => {
    if (!typeNames.includes(node.type.name)) return;
    const value = (node.attrs.textAlign ?? null) as string | null;
    if (!seen.includes(value)) seen.push(value);
  });
  return seen;
}

export interface AlignPresence {
  /** `mixed` 时没有单档可言，故为 `null`。 */
  value: string | null;
  mixed: boolean;
  /** 选区里没有任何可对齐的块（整篇代码块等）。 */
  empty: boolean;
}

/** 对齐控件该显示什么：单一档、混合、还是选区里没有可对齐块。 */
export function alignPresence(doc: EditorState['doc'], from: number, to: number): AlignPresence {
  const values = alignValues(doc, from, to);
  if (!values.length) return { value: null, mixed: false, empty: true };
  if (values.length > 1) return { value: null, mixed: true, empty: false };
  return { value: values[0], mixed: false, empty: false };
}

function listKindAt(doc: EditorState['doc'], pos: number): ListKind {
  const $pos = doc.resolve(pos);
  for (let depth = $pos.depth; depth >= 1; depth -= 1) {
    const node = $pos.node(depth);
    const kind = WRAPPER_KINDS[node.type.name];
    if (kind) return kind;
    if (node.type.name === TOGGLE_NODE) return 'toggle';
  }
  return 'none';
}

/** 选区碰到的文本块各自属于哪一档列表，按文档序去重（不在任何列表里＝`none`）。 */
export function listKindsIn(doc: EditorState['doc'], from: number, to: number): ListKind[] {
  if (to <= from) {
    const $pos = doc.resolve(from);
    // 光标停在块外面（两块之间）时无档可言，也绝不能读 $pos.parent。
    return $pos.parent.isTextblock ? [listKindAt(doc, from)] : [];
  }
  const kinds: ListKind[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return;
    const kind = listKindAt(doc, pos);
    if (!kinds.includes(kind)) kinds.push(kind);
  });
  return kinds;
}

export interface ListPresence {
  kind: ListKind | null;
  mixed: boolean;
  empty: boolean;
}

/** 列表控件该显示哪一档：五档里的单一档、跨档＝混合、还是没有文本块。 */
export function listPresence(doc: EditorState['doc'], from: number, to: number): ListPresence {
  const kinds = listKindsIn(doc, from, to);
  if (!kinds.length) return { kind: null, mixed: false, empty: true };
  if (kinds.length > 1) return { kind: null, mixed: true, empty: false };
  return { kind: kinds[0], mixed: false, empty: false };
}

/**
 * 方向族的写侧：把选区碰到的每个可定向块设成某一档。
 *
 * 「从左到右」是缺省态，所以它写回 `null`——"设过又设回来"的块要与从没设过的块逐字相同，
 * 否则正文里会留下一堆等价但不同的表示。空选区时 `nodesBetween` 一个节点都不访问
 * （ProseMirror 的初等区间语义），而面板上点方向最常见的情形就是光标停在块里，故单取父块。
 */
export function applyWritingDirection(
  state: EditorState,
  mode: WritingMode,
  typeNames: readonly string[] = ALIGNABLE_TYPES,
): Transaction | null {
  const next: WritingMode | null = CSS_WRITING_MODE[mode] ? mode : null;
  const tr = state.tr;
  let touched = false;
  const write = (pos: number, node: Node) => {
    if (node.attrs.writingDirection === next) return;
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, writingDirection: next });
    touched = true;
  };
  const { from, to, $from } = state.selection;
  if (from === to) {
    if (typeNames.includes($from.parent.type.name)) write($from.before($from.depth), $from.parent);
  } else {
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (typeNames.includes(node.type.name)) write(pos, node);
    });
  }
  return touched ? tr : null;
}

/** 每个块的拔层上限：嵌套列表最深处也不过这个数，超了就说明循环没在推进。 */
const MAX_LIFT_PASSES = 8;

/**
 * `style.list.none`「取消列表格式」的写侧：把选区碰到的每个文本块从所有列表／折叠容器里拔到
 * 顶层，块本身与块内格式不动。
 *
 * 逐块处理且**从后往前**：右侧的替换不影响左侧块的位置，所以捕获时的位置一直有效。
 * 每层的拔除走 ProseMirror 自己的 `lift`（`liftTarget` 求出能落地的最浅目标层），
 * 于是拆包装、切列表、相邻同类列表重接这些细节都不是这里自己写的规则。
 */
export function clearListFormat(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { from, to } = state.selection;
  const starts: number[] = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isTextblock) starts.push(pos);
  });

  const tr = state.tr;
  let changed = false;
  for (const start of starts.reverse()) {
    for (let pass = 0; pass < MAX_LIFT_PASSES; pass += 1) {
      // 位置按整条事务的映射还原：同块多轮拔层时，上一轮已经把它挪过。
      const mapped = tr.mapping.map(start, 1);
      const $inside = tr.doc.resolve(mapped + 1);
      let outermost: number | null = null;
      for (let depth = 1; depth <= $inside.depth; depth += 1) {
        if (REMOVABLE.has($inside.node(depth).type.name)) {
          outermost = depth;
          break;
        }
      }
      if (outermost === null) break;
      const range = new NodeRange($inside, $inside, outermost);
      const target = liftTarget(range);
      if (target === null || target >= outermost) break;
      tr.lift(range, target);
      changed = true;
    }
  }

  if (!changed) return false;
  if (dispatch) dispatch(tr.scrollIntoView());
  return true;
}
