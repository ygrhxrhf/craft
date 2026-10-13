import type { EditorState, Transaction } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import { BLOCK_HASH_PREFIX } from '@/lib/editor/block-anchor';
import { REMIND_PRESETS, remindInstantFor, type RemindPresetId } from '@/lib/task/remind-presets';
import { buildBlockMove, type MoveTarget } from '@/lib/editor/block-move';

export type BlockActionId =
  | 'remind'
  | 'insert-above'
  | 'insert-below'
  | 'move-up'
  | 'move-down'
  | 'move-top'
  | 'move-bottom'
  | 'copy-link'
  | 'convert-card'
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

export function blockMenuItems({ canDelete, isTask }: { canDelete: boolean; isTask?: boolean }): BlockAction[] {
  const items: BlockAction[] = [
    { id: 'insert-above', label: '在上方插入区块' },
    { id: 'insert-below', label: '在下方插入区块' },
    { id: 'move-up', label: '上移' },
    { id: 'move-down', label: '下移' },
    { id: 'move-top', label: '移至顶部' },
    { id: 'move-bottom', label: '移至底部' },
    { id: 'copy-link', label: '复制区块链接' },
    { id: 'convert-card', label: '转换为卡片' },
  ];
  if (isTask) items.splice(2, 0, { id: 'remind', label: '提醒我…' });
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

/** Clears a task item's reminder. Both 移除提醒 and 标记为已解决 end with the pill gone. */
export function clearTaskReminder(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
) {
  const { before } = blockBounds(state, index);
  const node = state.doc.child(index);
  if (node.type.name !== 'taskItem' || !node.attrs.remindAt) return;
  dispatch(state.tr.setNodeMarkup(before, undefined, { ...node.attrs, remindAt: null }));
}

export function setTaskReminder(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  index: number,
  preset: RemindPresetId,
  now: Date,
) {
  const { before } = blockBounds(state, index);
  const node = state.doc.child(index);
  if (node.type.name !== 'taskItem') return;
  const instant = remindInstantFor(preset, now);
  dispatch(
    state.tr.setNodeMarkup(before, undefined, {
      ...node.attrs,
      remindAt: instant ? instant.toISOString() : null,
    }),
  );
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
    case 'copy-link':
      // The link needs the document id and the clipboard, neither of which the editor state
      // holds, so the caller runs `blockLinkFor` itself.
      break;
    case 'delete':
      deleteBlock(state, dispatch, index);
      break;
  }
}
