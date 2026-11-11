import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { BLOCK_HASH_PREFIX } from '@/lib/editor/block-anchor';
import { ANCHORABLE_TYPES } from '@/lib/search/anchors';
import { REMIND_PRESETS, isInstantPreset, remindInstantFor, type RemindPresetId } from '@/lib/task/remind-presets';
import { applyCancelled } from '@/lib/editor/task-status';
import { buildBlockMove, type MoveTarget } from '@/lib/editor/block-move';
import { indentRunOf } from '@/lib/editor/indent-run';
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
  | 'image-auto'
  | 'image-large'
  | 'image-fill'
  | 'image-fit'
  | 'preview-small'
  | 'preview-regular'
  | 'preview-card'
  | 'preview-embed'
  | 'rename-link'
  | 'reload-link-info'
  | 'turn-into-text-link'
  | 'turn-to-rich-link'
  | 'open-link-new-tab'
  | 'copy-link-url'
  | 'open-page-card-style'
  | 'turn-into-regular-page'
  | 'turn-into-collection'
  | 'whiteboard-fullscreen'
  | 'reload-whiteboard'
  | 'download'
  | 'open-in-new-window'
  | 'delete';

/** G111: 官方 `LayoutStyle` 四档（与 `panels.md` §八 的 `previewTo*Style` 逐档吻合）。 */
export type LinkPreviewLayout = 'small' | 'regular' | 'card' | 'embed';

const PREVIEW_LAYOUTS: Partial<Record<BlockActionId, LinkPreviewLayout>> = {
  'preview-small': 'small',
  'preview-regular': 'regular',
  'preview-card': 'card',
  'preview-embed': 'embed',
};

const IMAGE_STYLES: Partial<Record<BlockActionId, { axis: 'imageSize' | 'imageFit'; value: string }>> = {
  'image-auto': { axis: 'imageSize', value: 'auto' },
  'image-large': { axis: 'imageSize', value: 'large' },
  'image-fill': { axis: 'imageFit', value: 'fill' },
  'image-fit': { axis: 'imageFit', value: 'fit' },
};

const MOVE_TARGETS: Record<string, MoveTarget> = {
  'move-up': 'up',
  'move-down': 'down',
  'move-top': 'top',
  'move-bottom': 'bottom',
};

export interface BlockAction {
  id: BlockActionId;
  label: string;
  /** G1470: entries sharing a group sit together; a separator sits between groups. */
  group?: number;
}

/**
 * Craft's own block menus vary per block type, but every entry we render has to do
 * something — the reminder, card and emoji entries carry their own handlers now.
 */
/** The 「提醒我…」 submenu: a task item or any anchorable block (G252). */
export const REMIND_MENU = REMIND_PRESETS;

/** The short row the 添加表情 entry offers. Picking the current one again clears it. */
export const BLOCK_EMOJIS = ['👍', '❤️', '😄', '🎉', '🔥', '👀'] as const;

/**
 * G1441 —— 块级 `⋯` 菜单**不是每种块一张清单**，而是「**公共内核五枚**＋按块类型注入的专属
 * 项」。内核＝`提醒我…`／`在上方插入区块`／`在下方插入区块`／`复制区块链接`／`删除`（三块共有）；
 * 普通文本块专属 4 枚＝`添加内容`／`添加表情`／`添加评论`／`转换为卡片`；代码块专属 4 枚＝
 * `语言`／`主题`／`全屏模式`／`复制代码`；任务块专属 **3** 枚＝`添加表情`／`添加评论`／
 * `转换为卡片`（独缺 `添加内容`——任务块已有子内容语义）。
 *
 * ⇒ 三个枚数在同一式子上闭合：9＝5＋4、9＝5＋4、**8＝5＋3**。`composeMenu` 就是这条式子；
 * 每种块只交自己的专属项，内核由它装。
 */
export interface MenuSlots {
  /** 专属项里排在提醒之前的那几枚（文本块四枚／代码块三枚／任务块三枚）。 */
  lead?: BlockAction[];
  /** 与提醒同段、紧随其后的本地增项（展开、分隔符样式、提示类型、转为富链接）。 */
  middle?: BlockAction[];
  /** 内核里「复制区块链接」之前的那一枚（代码块的 `复制代码`，官方逐字序如此）。 */
  beforeLink?: BlockAction[];
}

export const KERNEL_LABELS = [
  '提醒我…',
  '在上方插入区块',
  '在下方插入区块',
  '复制区块链接',
  '删除',
] as const;

/**
 * 公共内核五枚，组号由 `base` 起算：`base`＝提醒所在段，`base+1`＝插入两枚，`base+2`＝
 * 复制链接（代码块的 `复制代码` 与它同段），`base+3`＝删除。
 */
function kernelActions(base: number, canDelete: boolean, slots: MenuSlots = {}): BlockAction[] {
  const items: BlockAction[] = [
    { id: 'remind', label: '提醒我…', group: base },
    ...(slots.middle ?? []).map((item) => ({ ...item, group: base })),
    { id: 'insert-above', label: '在上方插入区块', group: base + 1 },
    { id: 'insert-below', label: '在下方插入区块', group: base + 1 },
    ...(slots.beforeLink ?? []).map((item) => ({ ...item, group: base + 2 })),
    { id: 'copy-link', label: '复制区块链接', group: base + 2 },
  ];
  if (canDelete) items.push({ id: 'delete', label: '删除', group: base + 3 });
  return items;
}

/**
 * G1440 —— 代码块的块级 `⋯` 菜单是**逐字 9 项、按此序**（官方 `blockdetails.*` 那族专属项
 * ＋ `commands.*` 公共项）：`语言`／`主题`／`全屏模式`／`提醒我…`／`在上方插入区块`／
 * `在下方插入区块`／`复制代码`／`复制区块链接`／`删除`。＝内核五枚＋专属四枚。
 */
const CODE_LEAD: BlockAction[] = [
  { id: 'code-language', label: '语言', group: 1 },
  { id: 'code-theme', label: '主题', group: 1 },
  { id: 'code-fullscreen', label: '全屏模式', group: 1 },
];

export const CODE_BLOCK_MENU: readonly BlockAction[] = [
  ...CODE_LEAD,
  ...kernelActions(2, true, { beforeLink: [{ id: 'code-copy', label: '复制代码', group: 4 }] }),
];

/** 普通文本块专属四枚（官方 9＝5＋4 的加数）。 */
export const TEXT_BLOCK_EXTRAS: readonly BlockAction[] = [
  { id: 'add-content', label: '添加内容', group: 1 },
  { id: 'add-emoji', label: '添加表情', group: 1 },
  { id: 'add-comment', label: '添加评论', group: 1 },
  { id: 'convert-card', label: '转换为卡片', group: 2 },
];

/**
 * 任务块专属三枚（官方 8＝5＋3 的加数）。**没有 `添加内容`** —— 任务块已有子内容语义，
 * 官方那一格是空的；`将任务标记为已取消` 也不在这张名册里（它走 `SET_CANCELLED` 键位）。
 */
export const TASK_BLOCK_EXTRAS: readonly BlockAction[] = [
  { id: 'add-emoji', label: '添加表情', group: 1 },
  { id: 'add-comment', label: '添加评论', group: 1 },
  { id: 'convert-card', label: '转换为卡片', group: 2 },
];

export function blockMenuItems({
  canDelete,
  isTask,
  canRemind,
  isToggle,
  toggleOpen,
  isDivider,
  isCallout,
  isCodeBlock,
  isImageBlock,
  isLinkPreview,
  isCardBlock,
  isWhiteboard,
  isCsvAttachment,
  canDownload,
  canTurnToRichLink,
}: {
  canDelete: boolean;
  isTask?: boolean;
  /** G252: any anchorable block can carry a reminder, not only a task item. */
  canRemind?: boolean;
  isToggle?: boolean;
  toggleOpen?: boolean;
  isDivider?: boolean;
  isCallout?: boolean;
  /** G384/G1440: a code block has its own nine-item roster, not the generic one. */
  isCodeBlock?: boolean;
  /** G111: 每种块自己的专属项（官方按块类型封闭的那张表）。 */
  isImageBlock?: boolean;
  isLinkPreview?: boolean;
  isCardBlock?: boolean;
  isWhiteboard?: boolean;
  /** G111：CSV 文件块（`attachment` 且名字以 `.csv` 结尾）才有「转为集合」。 */
  isCsvAttachment?: boolean;
  canDownload?: boolean;
  /** G111 `turnToRichLink`：正文本身就是链接的段落，可以升成链接预览块。 */
  canTurnToRichLink?: boolean;
}): BlockAction[] {
  // 代码块走它自己那份名册（9 项、逐字按序）——这正是 G384 说的"不能共用一份菜单配置"。
  if (isCodeBlock) {
    return CODE_BLOCK_MENU.filter((item) => item.id !== 'delete' || canDelete).map((item) => ({ ...item }));
  }
  // G111：官方块菜单是**按块类型封闭**的——图片 4 档、链接预览 4 档＋6 项、页面卡 3 项、
  // 白板 2 项，各自先列专属项，再接公共尾（插入／复制链接／删除）。
  if (isImageBlock) {
    return [
      { id: 'image-auto', label: '自动', group: 1 },
      { id: 'image-large', label: '大图', group: 1 },
      { id: 'image-fill', label: '填充', group: 1 },
      { id: 'image-fit', label: '适应', group: 1 },
      ...(canDownload
        ? [
            { id: 'download' as const, label: '下载', group: 2 },
            { id: 'open-in-new-window' as const, label: '在新窗口打开', group: 2 },
          ]
        : []),
      ...commonTail(canDelete),
    ];
  }
  if (isLinkPreview) {
    return [
      { id: 'preview-small', label: '小尺寸', group: 1 },
      { id: 'preview-regular', label: '常规', group: 1 },
      { id: 'preview-card', label: '卡片', group: 1 },
      { id: 'preview-embed', label: '嵌入', group: 1 },
      { id: 'rename-link', label: '重命名链接', group: 2 },
      { id: 'reload-link-info', label: '重新加载链接信息', group: 2 },
      { id: 'turn-into-text-link', label: '转为文本链接', group: 2 },
      { id: 'open-link-new-tab', label: '在新标签页打开', group: 3 },
      { id: 'copy-link-url', label: '复制链接地址', group: 3 },
      ...commonTail(canDelete),
    ];
  }
  if (isCardBlock) {
    return [
      { id: 'open-page-card-style', label: '卡片样式', group: 1 },
      { id: 'turn-into-regular-page', label: '转换为普通页面', group: 1 },
      ...commonTail(canDelete),
    ];
  }
  if (isWhiteboard) {
    return [
      { id: 'whiteboard-fullscreen', label: '全屏', group: 1 },
      { id: 'reload-whiteboard', label: '重新加载', group: 1 },
      { id: 'open-in-new-window', label: '在新窗口打开', group: 1 },
      ...commonTail(canDelete),
    ];
  }
  if (isCsvAttachment) {
    return [
      { id: 'turn-into-collection', label: '转为集合', group: 1 },
      ...(canDownload
        ? [
            { id: 'download' as const, label: '下载', group: 2 },
            { id: 'open-in-new-window' as const, label: '在新窗口打开', group: 2 },
          ]
        : []),
      ...commonTail(canDelete),
    ];
  }
  const items: BlockAction[] = [
    ...(isTask ? TASK_BLOCK_EXTRAS : TEXT_BLOCK_EXTRAS).map((item) => ({ ...item })),
  ];
  // G252：提醒在**任意可寻址块**上都能挂（不只是任务块）——内核那一枚由 `canRemind` 决定：
  // 任务块本身一定可挂，普通文本块要靠 `canRemind`。够不上内核时整枚不出现，其余内核照列。
  const middle: BlockAction[] = [];
  if (isToggle) middle.push({ id: 'toggle-open', label: toggleOpen ? '收起' : '展开', group: 3 });
  if (isDivider) middle.push({ id: 'divider-style', label: '分隔符样式', group: 3 });
  if (isCallout) middle.push({ id: 'callout-type', label: '提示类型', group: 3 });
  if (canTurnToRichLink) middle.push({ id: 'turn-to-rich-link', label: '转为富链接', group: 3 });
  // G1441：内核五枚。普通文本块与任务块的内核起点是第 3 段（前两段是专属项）。
  const kernel = kernelActions(3, canDelete, { middle });
  if (canRemind || isTask) {
    items.push(...kernel);
  } else {
    items.push(...kernel.filter((item) => item.id !== 'remind'));
  }
  return items;
}

/** G111 公共尾：官方那 6 项里本地有承载面的四枚（评论／复制链接／删除＋插入两枚）。 */
function commonTail(canDelete: boolean): BlockAction[] {
  return [
    { id: 'add-comment', label: '添加评论', group: 9 },
    { id: 'insert-above', label: '在上方插入区块', group: 9 },
    { id: 'insert-below', label: '在下方插入区块', group: 9 },
    { id: 'copy-link', label: '复制区块链接', group: 10 },
    ...(canDelete ? [{ id: 'delete' as const, label: '删除', group: 11 }] : []),
  ];
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

/** 已解决的提醒照样带着 `remindAt`；这里只判完成戳在不在。 */
function isResolved(attrs: Record<string, unknown>): boolean {
  return typeof attrs.reminderCompletedAt === 'string' && attrs.reminderCompletedAt !== '';
}

/**
 * G703 —— 「标记为已解决」：在提醒上打完成戳，**不删提醒**（官方 resolve 写 `isCompleted`＋
 * `completionDate`，与 `dueDate` 并存）。已经解决过、或本就没有提醒 ⇒ 不发事务，重复点不挪时间戳。
 */
export function resolveTaskReminder(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  now: Date,
) {
  const target = taskItemTarget(state, index);
  if (!target || !target.node.attrs.remindAt || isResolved(target.node.attrs)) return;
  dispatch(
    state.tr.setNodeMarkup(target.pos, undefined, {
      ...target.node.attrs,
      reminderCompletedAt: now.toISOString(),
    }),
  );
}

/** G703 —— 非任务块那一支的「标记为已解决」（与 `resolveTaskReminder` 对称）。 */
export function resolveBlockReminder(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  now: Date,
) {
  const target = anchorableBlockTarget(state, index);
  if (!target || !target.node.attrs.remindAt || isResolved(target.node.attrs)) return;
  dispatch(
    state.tr.setNodeMarkup(target.pos, undefined, {
      ...target.node.attrs,
      reminderCompletedAt: now.toISOString(),
    }),
  );
}

/** 清掉任务行的提醒。移除提醒清两枚属性（时刻与完成戳一起走）。 */
export function clearTaskReminder(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
) {
  const target = taskItemTarget(state, index);
  if (!target || !target.node.attrs.remindAt) return;
  dispatch(
    state.tr.setNodeMarkup(target.pos, undefined, {
      ...target.node.attrs,
      remindAt: null,
      reminderCompletedAt: null,
    }),
  );
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
  // G703：写新时刻即开启新一次提醒 ⇒ 顺手清掉旧的完成戳（已解决的那枚不再算数）。
  dispatch(
    state.tr.setNodeMarkup(target.pos, undefined, {
      ...target.node.attrs,
      remindAt: iso,
      reminderCompletedAt: null,
    }),
  );
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
  dispatch(
    state.tr.setNodeMarkup(target.pos, undefined, {
      ...target.node.attrs,
      remindAt: iso,
      reminderCompletedAt: null,
    }),
  );
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
  // G703：写新时刻即开启新一次提醒 ⇒ 旧的完成戳一起清掉。
  dispatch(
    state.tr.setNodeMarkup(target.pos, undefined, {
      ...target.node.attrs,
      remindAt: instant.toISOString(),
      reminderCompletedAt: null,
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
  // G703：写新时刻即开启新一次提醒 ⇒ 旧的完成戳一起清掉。
  dispatch(
    state.tr.setNodeMarkup(target.pos, undefined, {
      ...target.node.attrs,
      remindAt: instant.toISOString(),
      reminderCompletedAt: null,
    }),
  );
}

/** G252 —— 清掉非任务块的提醒（与 `clearTaskReminder` 对称；两枚属性一起清）。 */
export function clearBlockReminder(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
) {
  const target = anchorableBlockTarget(state, index);
  if (!target || !target.node.attrs.remindAt) return;
  dispatch(
    state.tr.setNodeMarkup(target.pos, undefined, {
      ...target.node.attrs,
      remindAt: null,
      reminderCompletedAt: null,
    }),
  );
}

function locationOrigin(): string {
  return typeof location === 'undefined' ? '' : location.origin;
}

export function deleteBlock(state: EditorState, dispatch: (tr: Transaction) => void, index: number) {
  // G660: deletion takes the block's **indent subtree** with it (`G0e` /
  // `extendWithIndentChildren` is the same union the move path uses), so a parent block does not
  // leave its children orphaned at the parent's own depth. A block with no indented followers is
  // still just itself.
  const indents = Array.from({ length: state.doc.childCount }, (_, i) => {
    const raw = state.doc.child(i).attrs?.indent;
    if (raw === null) return null;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
  });
  const run = indentRunOf(indents, index);
  if (run.end - run.start >= state.doc.childCount) throw new Error('文档至少要保留一个区块');
  const before = blockBounds(state, run.start).before;
  const after = blockBounds(state, run.end - 1).after;
  dispatch(state.tr.delete(before, after).scrollIntoView());
}

/**
 * G111 —— 图片块的 4 档样式。官方把两根轴（尺寸 auto|large × 适配 fill|fit）摊平成四项，
 * 每一项只改自己那根轴（`styles.md` 记的结构），另一根保持原值。
 */
export function setImageStyle(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  id: BlockActionId,
) {
  const style = IMAGE_STYLES[id];
  if (!style) return;
  const node = state.doc.child(index);
  if (node.type.name !== 'imageBlock') return;
  const { before } = blockBounds(state, index);
  dispatch(state.tr.setNodeMarkup(before, undefined, { ...node.attrs, [style.axis]: style.value }));
}

/** G111 —— 链接预览的 `LayoutStyle` 四档（small／regular／card／embed）。 */
export function setLinkPreviewLayout(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  id: BlockActionId,
) {
  const layout = PREVIEW_LAYOUTS[id];
  if (!layout) return;
  const node = state.doc.child(index);
  if (node.type.name !== 'linkPreview') return;
  const { before } = blockBounds(state, index);
  dispatch(state.tr.setNodeMarkup(before, undefined, { ...node.attrs, layout }));
}

/** G111 `renameLink` —— 只换标题；摘要与站点信息原样留着。 */
export function renameLinkPreview(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  title: string | null,
) {
  const node = state.doc.child(index);
  if (node.type.name !== 'linkPreview') return;
  const { before } = blockBounds(state, index);
  dispatch(state.tr.setNodeMarkup(before, undefined, { ...node.attrs, title }));
}

/**
 * G111 `reloadLinkInfo` —— 清掉缓存的元信息并让视图重新抓一次。`reloadSeq` 是视图 effect 的
 * 依赖：只清属性时若原值本来就空，effect 不会重跑，所以还要动这枚序号。
 */
export function reloadLinkPreview(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
) {
  const node = state.doc.child(index);
  if (node.type.name !== 'linkPreview') return;
  const { before } = blockBounds(state, index);
  const seq = typeof node.attrs.reloadSeq === 'number' ? node.attrs.reloadSeq : 0;
  dispatch(
    state.tr.setNodeMarkup(before, undefined, {
      ...node.attrs,
      title: null,
      description: null,
      image: null,
      favicon: null,
      siteName: null,
      reloadSeq: seq + 1,
    }),
  );
}

/**
 * G111 `turnIntoTextLink` —— 整块换成一个带链接标记的段落（标题优先，没有就用 URL）。
 * 返回 false 表示这颗 schema 里没有 `link` 标记，调用方不该假装动作发生过。
 */
export function linkPreviewToText(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
): boolean {
  const node = state.doc.child(index);
  if (node.type.name !== 'linkPreview') return false;
  const link = state.schema.marks.link;
  const paragraph = state.schema.nodes.paragraph;
  const url = typeof node.attrs.url === 'string' ? node.attrs.url : '';
  if (!link || !paragraph || !url) return false;
  const label = (typeof node.attrs.title === 'string' && node.attrs.title) || url;
  const { before, after } = blockBounds(state, index);
  dispatch(
    state.tr.replaceWith(before, after, paragraph.create(null, state.schema.text(label, [link.create({ href: url })]))),
  );
  return true;
}

/**
 * G111 `turnToRichLink` —— 反向：把一个「正文就是链接地址」的段落（或段落里有链接标记）
 * 换成链接预览块。官方那两项互逆，所以两处共用同一套 URL 判据。
 */
export function textToLinkPreview(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
): boolean {
  const node = state.doc.child(index);
  const preview = state.schema.nodes.linkPreview;
  if (!preview) return false;
  const text = node.textContent.trim();
  let url: string | null = /^https?:\/\/\S+$/i.test(text) ? text : null;
  if (!url) {
    node.descendants((child) => {
      const mark = child.marks.find((candidate) => candidate.type.name === 'link');
      if (mark && typeof mark.attrs.href === 'string') {
        url = mark.attrs.href;
        return false;
      }
      return true;
    });
  }
  if (!url) return false;
  const { before, after } = blockBounds(state, index);
  dispatch(state.tr.replaceWith(before, after, preview.create({ url })));
  return true;
}

/** G111 `turnIntoRegularPage` —— 卡片拆回普通页面（内容原样平铺，不再套一层卡）。 */
export function unwrapCardBlock(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
): boolean {
  const node = state.doc.child(index);
  if (node.type.name !== 'cardBlock' || node.childCount === 0) return false;
  const { before, after } = blockBounds(state, index);
  dispatch(state.tr.replaceWith(before, after, node.content));
  return true;
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
    case 'image-auto':
    case 'image-large':
    case 'image-fill':
    case 'image-fit':
      setImageStyle(state, dispatch, index, id);
      break;
    case 'preview-small':
    case 'preview-regular':
    case 'preview-card':
    case 'preview-embed':
      setLinkPreviewLayout(state, dispatch, index, id);
      break;
    case 'turn-into-text-link':
      linkPreviewToText(state, dispatch, index);
      break;
    case 'turn-to-rich-link':
      textToLinkPreview(state, dispatch, index);
      break;
    case 'turn-into-regular-page':
      unwrapCardBlock(state, dispatch, index);
      break;
    case 'rename-link':
    case 'reload-link-info':
    case 'open-link-new-tab':
    case 'copy-link-url':
    case 'open-page-card-style':
    case 'whiteboard-fullscreen':
    case 'reload-whiteboard':
    case 'turn-into-collection':
    case 'download':
    case 'open-in-new-window':
      // 这几枚需要 DOM／剪贴板／面板状态，调用点接（与 copy-link、code-copy 同形）。
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
