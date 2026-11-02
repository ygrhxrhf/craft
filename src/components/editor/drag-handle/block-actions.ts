import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { BLOCK_HASH_PREFIX } from '@/lib/editor/block-anchor';
import { ANCHORABLE_TYPES } from '@/lib/search/anchors';
import { REMIND_PRESETS, isInstantPreset, remindInstantFor, type RemindPresetId } from '@/lib/task/remind-presets';
import { applyCancelled } from '@/lib/editor/task-status';
import { buildBlockMove, type MoveTarget } from '@/lib/editor/block-move';
import { type DividerStyle } from '@/lib/editor/divider-styles';
import {
  normalizeWashiColor,
  normalizeWashiPattern,
  type SeparatorMaterial,
} from '@/lib/editor/separator-material';
import { type CalloutType } from '@/components/editor/extensions/callout';

export type BlockActionId =
  | 'remind'
  | 'set-cancelled'
  | 'insert-above'
  | 'insert-below'
  | 'move-up'
  | 'move-down'
  | 'move-top'
  | 'move-bottom'
  | 'copy-link'
  | 'convert-card'
  | 'add-comment'
  | 'add-emoji'
  | 'toggle-open'
  | 'add-content'
  | 'divider-style'
  | 'callout-type'
  | 'code-language'
  | 'code-theme'
  | 'code-fullscreen'
  | 'code-copy'
  | 'delete';

const MOVE_TARGETS: Record<string, MoveTarget> = {
  'move-up': 'up',
  'move-down': 'down',
  'move-top': 'top',
  'move-bottom': 'bottom',
};

export interface BlockAction {
  id: BlockActionId;
  label: string;
}

/**
 * Craft's own block menus vary per block type, but every entry we render has to do
 * something — the reminder, card and emoji entries stay out until they have an action.
 */
/** The 「提醒我…」 submenu, only offered on a task item. */
export const REMIND_MENU = REMIND_PRESETS;

/** The short row the 添加表情 entry offers. Picking the current one again clears it. */
export const BLOCK_EMOJIS = ['👍', '❤️', '😄', '🎉', '🔥', '👀'] as const;

/**
 * G1440 —— 代码块的块级 `⋯` 菜单是**逐字 9 项、按此序**（官方 `blockdetails.*` 那族专属项
 * ＋ `commands.*` 公共项）：`语言`／`主题`／`全屏模式`／`提醒我…`／`在上方插入区块`／
 * `在下方插入区块`／`复制代码`／`复制区块链接`／`删除`。
 *
 * ⇒ 这是 G384 那条"块级菜单＝**一枚公共内核＋按块类型注入的专属项**"的直接证据：
 * 专属项（语言/主题/全屏/复制代码）来自 `blockdetails.*`，其余五枚是公共内核。
 */
export const CODE_BLOCK_MENU: readonly { id: BlockActionId; label: string }[] = [
  { id: 'code-language', label: '语言' },
  { id: 'code-theme', label: '主题' },
  { id: 'code-fullscreen', label: '全屏模式' },
  { id: 'remind', label: '提醒我…' },
  { id: 'insert-above', label: '在上方插入区块' },
  { id: 'insert-below', label: '在下方插入区块' },
  { id: 'code-copy', label: '复制代码' },
  { id: 'copy-link', label: '复制区块链接' },
  { id: 'delete', label: '删除' },
] as const;

export function blockMenuItems({
  canDelete,
  isTask,
  taskCancelled,
  canRemind,
  isToggle,
  toggleOpen,
  isDivider,
  isCallout,
  isCodeBlock,
}: {
  canDelete: boolean;
  isTask?: boolean;
  taskCancelled?: boolean;
  /** G252: any anchorable block can carry a reminder, not only a task item. */
  canRemind?: boolean;
  isToggle?: boolean;
  toggleOpen?: boolean;
  isDivider?: boolean;
  isCallout?: boolean;
  /** G384/G1440: a code block has its own nine-item roster, not the generic one. */
  isCodeBlock?: boolean;
}): BlockAction[] {
  // 代码块走它自己那份名册（9 项、逐字按序）——这正是 G384 说的"不能共用一份菜单配置"。
  if (isCodeBlock) {
    return CODE_BLOCK_MENU.filter((item) => item.id !== 'delete' || canDelete).map((item) => ({ ...item }));
  }
  const items: BlockAction[] = [
    { id: 'add-content', label: '添加内容' },
    { id: 'insert-above', label: '在上方插入区块' },
    { id: 'insert-below', label: '在下方插入区块' },
    { id: 'move-up', label: '上移' },
    { id: 'move-down', label: '下移' },
    { id: 'move-top', label: '移至顶部' },
    { id: 'move-bottom', label: '移至底部' },
    { id: 'copy-link', label: '复制区块链接' },
    { id: 'convert-card', label: '转换为卡片' },
    { id: 'add-comment', label: '添加评论' },
    { id: 'add-emoji', label: '添加表情' },
  ];
  // G252：提醒在**任意可寻址块**上都能挂（不只是任务块），所以这一枚由 `canRemind` 决定，
  // 不再绑在 `isTask` 上；任务块本身一定可挂，`isTask` 也算数。`set-cancelled` 才是任务块专属。
  if (canRemind || isTask) items.splice(2, 0, { id: 'remind', label: '提醒我…' });
  if (isTask) {
    items.splice(3, 0, {
      id: 'set-cancelled',
      label: taskCancelled ? '取消标记' : '将任务标记为已取消',
    });
  }
  if (isToggle) items.splice(2, 0, { id: 'toggle-open', label: toggleOpen ? '收起' : '展开' });
  if (isDivider) items.splice(2, 0, { id: 'divider-style', label: '分隔符样式' });
  if (isCallout) items.splice(2, 0, { id: 'callout-type', label: '提示类型' });
  if (canDelete) items.push({ id: 'delete', label: '删除' });
  return items;
}

/** The positions on either side of a top-level block, outside it rather than inside. */
function blockBounds(state: EditorState, index: number) {
  let before = 0;
  for (let child = 0; child < index; child += 1) before += state.doc.child(child).nodeSize;
  return { before, after: before + state.doc.child(index).nodeSize };
}

function insertAdjacent(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  above: boolean,
) {
  const { before, after } = blockBounds(state, index);
  const paragraph = state.schema.nodes.paragraph;
  const position = above ? before : after;
  const tr = state.tr.insert(position, paragraph.create());
  // The caret belongs inside the new block, one step past the boundary it was inserted at.
  dispatch(tr.setSelection(TextSelection.create(tr.doc, position + 1)).scrollIntoView());
}

export function insertBlockAbove(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
) {
  insertAdjacent(state, dispatch, index, true);
}

export function insertBlockBelow(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
) {
  insertAdjacent(state, dispatch, index, false);
}

/**
 * The address a "复制区块链接" copies (G1470). A block that already carries an id keeps it; one
 * that does not gets a fresh one stamped on, so the link survives a later edit. The hash shape is
 * the same `#b-<id>` the rest of the app already jumps to.
 */
export function blockLinkFor(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  documentId: string,
  mint: () => string,
): string {
  const { before } = blockBounds(state, index);
  const node = state.doc.child(index);
  const existing = typeof node.attrs.blockId === 'string' && node.attrs.blockId ? node.attrs.blockId : null;
  const blockId = existing ?? mint();
  if (!existing) {
    dispatch(state.tr.setNodeMarkup(before, undefined, { ...node.attrs, blockId }));
  }
  return `${locationOrigin()}/documents/${documentId}#${BLOCK_HASH_PREFIX}${blockId}`;
}

/**
 * Sets a task item's reminder (G1466). The preset resolves to an instant, which is stored on the
 * task item and rides the existing task sync. `saveForLater` and `custom` have no computed time,
 * so they clear the reminder rather than inventing one.
 */
/**
 * Starts a new block below the addressed one with the slash already typed, so the insert menu
 * opens there (G1470's 添加内容). The caret lands after the slash.
 */
export function addContentBelow(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
) {
  const { after } = blockBounds(state, index);
  const paragraph = state.schema.nodes.paragraph;
  const block = paragraph.create(null, state.schema.text('/'));
  const tr = state.tr.insert(after, block);
  dispatch(tr.setSelection(TextSelection.create(tr.doc, after + block.nodeSize - 1)).scrollIntoView());
}

/** Sets a callout's kind. Does nothing to any other block. */
export function setCalloutType(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  type: CalloutType,
) {
  const node = state.doc.child(index);
  if (node.type.name !== 'callout') return;
  const { before } = blockBounds(state, index);
  dispatch(state.tr.setNodeMarkup(before, undefined, { ...node.attrs, type }));
}

/** Sets a divider's weight. Does nothing to any other block. */
export function setDividerStyle(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  style: DividerStyle,
) {
  const node = state.doc.child(index);
  if (node.type.name !== 'divider') return;
  const { before } = blockBounds(state, index);
  dispatch(state.tr.setNodeMarkup(before, undefined, { ...node.attrs, style }));
}

/**
 * G1247：分隔线的**材质轴**。官方写侧三件＝`--separator washi` ＋ `--washi-pattern <name>` ＋
 * `--washi-color <hex>`；这里一次把材质、图案、颜色都写进块属性。`line` 档只换材质，
 * 图案与颜色原样留着（切回和纸时还在），但渲染侧只看材质。
 */
export function setSeparatorMaterial(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  material: SeparatorMaterial,
  pattern?: string,
  color?: string,
) {
  const node = state.doc.child(index);
  if (node.type.name !== 'divider') return;
  const { before } = blockBounds(state, index);
  dispatch(state.tr.setNodeMarkup(before, undefined, {
    ...node.attrs,
    separator: material,
    ...(pattern ? { washiPattern: normalizeWashiPattern(pattern) } : {}),
    ...(color ? { washiColor: normalizeWashiColor(color) } : {}),
  }));
}

/** Flips a toggle block between open and closed. Does nothing to any other block. */
export function toggleBlockOpen(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
) {
  const node = state.doc.child(index);
  if (node.type.name !== 'toggleBlock') return;
  const { before } = blockBounds(state, index);
  dispatch(state.tr.setNodeMarkup(before, undefined, { ...node.attrs, open: !node.attrs.open }));
}

/**
 * Sets or clears the emoji on a block (G1470's 添加表情). Picking the emoji the block already
 * carries removes it, which is how a reaction is taken back.
 */
export function setBlockEmoji(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  emoji: string,
) {
  const { before } = blockBounds(state, index);
  const node = state.doc.child(index);
  const next = node.attrs.emoji === emoji ? null : emoji;
  dispatch(state.tr.setNodeMarkup(before, undefined, { ...node.attrs, emoji: next }));
}

/**
 * Wraps the addressed block in a card (G1470's 转换为卡片). A block that is already a card is left
 * alone, so the entry cannot nest cards inside cards.
 */
export function convertBlockToCard(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
) {
  const card = state.schema.nodes.cardBlock;
  if (!card) return;
  const node = state.doc.child(index);
  if (node.type === card) return;
  const { before, after } = blockBounds(state, index);
  dispatch(state.tr.replaceWith(before, after, card.create(null, node)));
}

/**
 * 任务行有两种形状：`taskItem` 直接是顶层块（导入与旧文档），或被 `taskList` 包着
 * （编辑器里敲 `/待办` 的正常产物）。只认前一形的话，提醒与取消两枚菜单项在真浏览器里
 * 一枚都点不到——所以寻址必须两形通用，选中的那一行优先于该块里的第一行。
 */
export function taskItemTarget(state: EditorState, index: number): { pos: number; node: Node } | null {
  const { before } = blockBounds(state, index);
  const child = state.doc.child(index);
  if (child.type.name === 'taskItem') return { pos: before, node: child };
  const caret = state.selection.from;
  let first: { pos: number; node: Node } | null = null;
  let enclosing: { pos: number; node: Node } | null = null;
  child.descendants((node, offset) => {
    if (node.type.name !== 'taskItem') return true;
    const pos = before + 1 + offset;
    first ??= { pos, node };
    if (caret > pos && caret < pos + node.nodeSize) enclosing = { pos, node };
    return true;
  });
  return enclosing ?? first;
}

/**
 * 键盘那一路：`SET_CANCELLED` 作用在光标所在的那一行，而不是拖拽菜单那样按顶层块寻址。
 * 嵌套列表里以最深的一枚为准（光标在子项里就取消子项），非任务行返回 false＝这枚键没被吃掉。
 */
export function toggleTaskCancelledAtSelection(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  now: Date,
): boolean {
  const caret = state.selection.from;
  const enclosing: { pos: number; node: Node }[] = [];
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'taskItem' && caret >= pos && caret <= pos + node.nodeSize) {
      enclosing.push({ pos, node });
    }
    return true;
  });
  const target = enclosing[enclosing.length - 1];
  if (!target) return false;
  const attrs = applyCancelled(
    {
      checked: !!target.node.attrs.checked,
      cancelled: !!target.node.attrs.cancelled,
      cancelledAt: typeof target.node.attrs.cancelledAt === 'string' ? target.node.attrs.cancelledAt : null,
    },
    !target.node.attrs.cancelled,
    now,
  );
  dispatch(state.tr.setNodeMarkup(target.pos, undefined, { ...target.node.attrs, ...attrs }).scrollIntoView());
  return true;
}

/** Clears a task item's reminder. Both 移除提醒 and 标记为已解决 end with the pill gone. */
export function clearTaskReminder(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
) {
  const target = taskItemTarget(state, index);
  if (!target || !target.node.attrs.remindAt) return;
  dispatch(state.tr.setNodeMarkup(target.pos, undefined, { ...target.node.attrs, remindAt: null }));
}

/**
 * `SET_CANCELLED`／`取消标记` — 同一枚轴上的第三档（tasks.md:11）。走的是 `task-status.ts`
 * 那个纯核：取消会把 `checked` 让出来并记一个时间戳，再点一次则整档清干净。
 * 返回假值时不发事务，所以重复点同一档不会把时间戳挪到新的一次点击上。
 */
export function setTaskCancelled(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  now: Date,
) {
  const target = taskItemTarget(state, index);
  if (!target) return;
  const attrs = applyCancelled(
    {
      checked: !!target.node.attrs.checked,
      cancelled: !!target.node.attrs.cancelled,
      cancelledAt: typeof target.node.attrs.cancelledAt === 'string' ? target.node.attrs.cancelledAt : null,
    },
    !target.node.attrs.cancelled,
    now,
  );
  dispatch(state.tr.setNodeMarkup(target.pos, undefined, { ...target.node.attrs, ...attrs }));
}

/**
 * G1466 —— 用一个**显式时刻**写提醒（「自定义…」走这里）。与 `setTaskReminder` 分开：
 * 后者吃预设 id，这一支吃已经算好的 ISO 串（自定义选择器给的就是它）。
 */
export function setTaskReminderAt(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  iso: string | null,
) {
  const target = taskItemTarget(state, index);
  if (!target) return;
  dispatch(state.tr.setNodeMarkup(target.pos, undefined, { ...target.node.attrs, remindAt: iso }));
}

/** G1466 —— 非任务块上的显式时刻提醒（「自定义…」的块那一支）。 */
export function setBlockReminderAt(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  iso: string | null,
) {
  const target = anchorableBlockTarget(state, index);
  if (!target) return;
  dispatch(state.tr.setNodeMarkup(target.pos, undefined, { ...target.node.attrs, remindAt: iso }));
}

export function setTaskReminder(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  preset: RemindPresetId,
  now: Date,
) {
  const target = taskItemTarget(state, index);
  if (!target) return;
  // ☆ `saveForLater`／`custom` 两档没有算得出来的时刻（官方那边一档进"以后"桶、一档开自定义
  // 选择器），本仓两样都没有对应列。此前这里照旧发事务并把 `remindAt` 写成 `null` ⇒ 点这两档
  // 会**静默抹掉已有提醒**（数据丢失，且屏上没有任何提示）。没有承载面就不发事务。
  if (!isInstantPreset(preset)) return;
  const instant = remindInstantFor(preset, now);
  if (!instant) return;
  dispatch(
    state.tr.setNodeMarkup(target.pos, undefined, {
      ...target.node.attrs,
      remindAt: instant.toISOString(),
    }),
  );
}

/**
 * G252 —— 非任务块的提醒目标：可寻址块（`paragraph`／`heading`）的顶层节点。任务块走
 * `taskItemTarget`，两者互斥（`taskItem` 不在 `ANCHORABLE_TYPES` 里）。
 * 判据是块上已有 `blockId`——深链要它寻址，没有 id 的块不给挂提醒（免得落一枚指不回去的提醒）。
 */
export function anchorableBlockTarget(state: EditorState, index: number): { pos: number; node: Node } | null {
  if (index < 0 || index >= state.doc.childCount) return null;
  const child = state.doc.child(index);
  if (!ANCHORABLE_TYPES.includes(child.type.name)) return null;
  if (typeof child.attrs.blockId !== 'string' || !child.attrs.blockId) return null;
  return { pos: blockBounds(state, index).before, node: child };
}

/**
 * G252 —— 在非任务块上设提醒。与 `setTaskReminder` 同一套七档预设、同一枚 `remindAt` 属性，
 * 只是作用在可寻址块而不是任务行上。同样：没有承载面的两档不发事务（不静默抹掉已有提醒）。
 */
export function setBlockReminder(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  preset: RemindPresetId,
  now: Date,
) {
  const target = anchorableBlockTarget(state, index);
  if (!target) return;
  if (!isInstantPreset(preset)) return;
  const instant = remindInstantFor(preset, now);
  if (!instant) return;
  dispatch(
    state.tr.setNodeMarkup(target.pos, undefined, {
      ...target.node.attrs,
      remindAt: instant.toISOString(),
    }),
  );
}

/** G252 —— 清掉非任务块的提醒（与 `clearTaskReminder` 对称）。 */
export function clearBlockReminder(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
) {
  const target = anchorableBlockTarget(state, index);
  if (!target || !target.node.attrs.remindAt) return;
  dispatch(state.tr.setNodeMarkup(target.pos, undefined, { ...target.node.attrs, remindAt: null }));
}

function locationOrigin(): string {
  return typeof location === 'undefined' ? '' : location.origin;
}

export function deleteBlock(state: EditorState, dispatch: (tr: Transaction) => void, index: number) {
  if (state.doc.childCount <= 1) throw new Error('文档至少要保留一个区块');
  const { before, after } = blockBounds(state, index);
  dispatch(state.tr.delete(before, after).scrollIntoView());
}

/** The menu hands us an id; this is the only place that decides what it does. */
export function applyBlockAction(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  id: BlockActionId,
) {
  const target = MOVE_TARGETS[id];
  if (target) {
    // The move reads the selection, so it has to be inside the addressed block first.
    const { before } = blockBounds(state, index);
    const placed = state.tr.setSelection(TextSelection.near(state.doc.resolve(before + 1)));
    const moved = buildBlockMove(state.apply(placed), target);
    if (moved) dispatch(moved);
    return;
  }

  switch (id) {
    case 'insert-above':
      insertBlockAbove(state, dispatch, index);
      break;
    case 'insert-below':
      insertBlockBelow(state, dispatch, index);
      break;
    case 'convert-card':
      convertBlockToCard(state, dispatch, index);
      break;
    case 'add-comment':
      // The composer lives in the info panel, so this only names the block. The menu opens it.
      break;
    case 'add-emoji':
      // The emoji is chosen from the submenu, which calls setBlockEmoji itself.
      break;
    case 'toggle-open':
      toggleBlockOpen(state, dispatch, index);
      break;
    case 'set-cancelled':
      setTaskCancelled(state, dispatch, index, new Date());
      break;
    case 'add-content':
      addContentBelow(state, dispatch, index);
      break;
    case 'divider-style':
      // The weight is chosen from the submenu, which calls setDividerStyle itself.
      break;
    case 'callout-type':
      // The kind is chosen from the submenu, which calls setCalloutType itself.
      break;
    case 'code-language':
    case 'code-theme':
      // 语言/主题从子菜单选（与 callout-type 同形），点条目不做事。
      break;
    case 'code-fullscreen':
      // 由调用点开代码块的全屏视图（需要 DOM 与组件状态，不在这里做）。
      break;
    case 'code-copy':
      // 由调用点读代码文本写剪贴板。
      break;
    case 'copy-link':
      // The link needs the document id and the clipboard, neither of which the editor state
      // holds, so the caller runs `blockLinkFor` itself.
      break;
    case 'delete':
      deleteBlock(state, dispatch, index);
      break;
  }
}

/**
 * G357: set a task item's schedule (calendar) or deadline (flag) date. Both ride the task item as
 * attributes next to `remindAt`, so the row's three time icons read the same source the task sync
 * projects. `null` clears the field (the icon then disappears).
 */
export function setTaskDateField(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  field: 'scheduleDate' | 'dueDate',
  iso: string | null,
) {
  const target = taskItemTarget(state, index);
  if (!target) return;
  dispatch(state.tr.setNodeMarkup(target.pos, undefined, { ...target.node.attrs, [field]: iso }));
}
