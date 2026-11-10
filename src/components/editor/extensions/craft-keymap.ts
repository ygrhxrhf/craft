import { Extension } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { closeHistory } from '@tiptap/pm/history';
import type { Editor } from '@tiptap/react';

import { buildBlockMove, topLevelIndexOf, topLevelStart, type MoveTarget } from '@/lib/editor/block-move';
import { cloneWithFreshBlockIds } from '@/lib/editor/clone-block';
import { buildDowngradeFlatten } from '@/lib/editor/downgrade-command';
import { nextWordOffset, prevWordOffset } from '@/lib/editor/word-nav';
import { nextFormatStep, nextBackspaceStep, isEmptyBlock, hasDecoration, mergeCaretIndex, previousSibling } from '@/lib/editor/format-downgrade';
import { decorationAt } from '@/lib/editor/format-commands';
import { toggledDecoration } from '@/lib/editor/style-keys';
import { applyGroup, applyGroupIndices, applyUngroup } from '@/lib/editor/block-group';
import { useBlockSelectStore } from '@/lib/store/use-block-select-store';
import { mergeStyleWinner } from '@/lib/editor/merge-text-blocks';
import { requestLink } from '@/lib/store/use-link-request-store';
import { toggleTaskCancelledAtSelection } from '@/components/editor/drag-handle/block-actions';
import { setTaskDateField } from '@/components/editor/drag-handle/block-actions';
import { localDayInstant } from '@/lib/task/wall-clock';
import { KEY_BINDINGS, detectPlatform, matches } from '@/lib/editor/keymap';
import { isImeComposing } from '@/lib/editor/ime-guard';
import { deleteStepFor } from '@/lib/editor/forward-delete';
import { caretInsideAtom, countAtomicInlines } from '@/lib/editor/inline-atoms';
import { tableDimensions, clearCellContents } from '@/lib/table-utils';
import { nextOpenForAllToggles, setOpenOnAllToggles, toggleSummaryTarget } from './toggle-all';
import { tableAxisForShortcut } from '@/lib/editor/table-shortcuts';
import {
  TABLE_SIZE_LIMIT_DURATION,
  TABLE_SIZE_LIMIT_SUBTITLE,
  tableSizeAllowed,
  tableLimitToastTitle,
} from '@/lib/collection/limits';
import { toast } from '@/components/ui/toast';
import { useFindReplaceStore } from '@/lib/store/use-find-replace-store';
import { useCommentRequestStore } from '@/lib/store/use-comment-request-store';
import { useRightPanelStore } from '@/lib/store/use-right-panel-store';
import { promptDialog } from '@/lib/dialog/show';
import { useTitleRequestStore } from '@/lib/store/use-title-request-store';
import { useCardConfigStore } from '@/lib/store/use-card-config-store';
import { selectToEdgeAction } from '@/lib/editor/select-to-edge';
import { applyToggleList } from '@/lib/editor/toggle-list';
import { escapeRung } from '@/lib/editor/escape-rungs';

export const CRAFT_KEYMAP_KEY = new PluginKey('craftKeymap');

/**
 * Why this is a keydown handler and not `addKeyboardShortcuts`: the collected bindings do not
 * survive one `Mod-...` string. `⌘⌥1` on Mac is `Ctrl-Shift-1` on Windows, and `NO_LIST` moves
 * all the way to the backtick — `bae(d)` is the rule that picks which side to read.
 *
 * Styles are *set*, lists are *toggled*: the style slots correspond one to one with the official
 * hierarchy (`title/subtitle/heading/strong/body`), so landing on the same slot twice should stay
 * put, while the list slots have no "set" command in the editor and the local slash menu already
 * toggles them.
 */
const STYLE_SLOTS: Record<string, (editor: Editor) => boolean> = {
  // The official hierarchy has no 1–4 ladder, but the export table fixes title→h1,
  // subtitle→h2, heading→h3, strong→h4; the format panel now shows those semantic names.
  TITLE: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  SUBTITLE: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  HEADING: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  STRONG: (editor) => editor.chain().focus().setHeading({ level: 4 }).run(),
  // G278: dropping to Body flattens the block's indented children up to its level — the downgrade
  // is a real un-nesting, not just a style swap. The flatten runs first so the style change lands
  // on a document whose indent attributes are already final.
  BODY: (editor) => {
    const index = topLevelIndexOf(editor.state.doc, editor.state.selection.from);
    const flatten = buildDowngradeFlatten(editor.state, index);
    if (flatten) editor.view.dispatch(flatten);
    return editor.chain().focus().setParagraph().run();
  },
  TODO_LIST: (editor) => editor.chain().focus().toggleTaskList().run(),
  TOGGLE_LIST: (editor) =>
    applyToggleList({
      state: editor.state,
      dispatch: (tr) => editor.view.dispatch(tr),
      chain: () => editor.chain(),
    }),
  BULLET_LIST: (editor) => editor.chain().focus().toggleBulletList().run(),
  NUMBERED_LIST: (editor) => editor.chain().focus().toggleOrderedList().run(),
  NO_LIST: (editor) => unsetList(editor),
};

const MOVE_TARGETS: Record<string, MoveTarget> = {
  MOVE_BLOCK_UP: 'up',
  MOVE_BLOCK_DOWN: 'down',
  MOVE_BLOCK_TOP: 'top',
  MOVE_BLOCK_BOTTOM: 'bottom',
  MOVE_BLOCK_TOP_MAC: 'top',
  MOVE_BLOCK_BOTTOM_MAC: 'bottom',
};

function unsetList(editor: Editor): boolean {
  if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
    return editor.chain().focus().liftListItem('listItem').run();
  }
  if (editor.isActive('taskList')) return editor.chain().focus().liftListItem('taskItem').run();
  if (editor.isActive('toggleBlock')) return editor.chain().focus().unsetToggleBlock().run();
  return editor.chain().focus().setParagraph().run();
}

/** `⌘D` — copies the top-level block holding the selection, straight below itself. */
function duplicateTopBlock(editor: Editor): boolean {
  const { state, view } = editor;
  const index = topLevelIndexOf(state.doc, state.selection.from);
  if (index < 0) return false;
  const start = topLevelStart(state.doc, index);
  // G573: the copy gets fresh block ids so both blocks stay independently addressable.
  const child = cloneWithFreshBlockIds(state.doc.child(index));
  view.dispatch(state.tr.insert(start + child.nodeSize, child));
  // G1551: the official build hands focus to the body and enters the block-select state right
  // after the duplicate — the local equivalent is a node selection on the new block, blurred.
  const after = view.state;
  const duplicateStart = topLevelStart(after.doc, index + 1);
  view.dispatch(after.tr.setSelection(NodeSelection.create(after.doc, duplicateStart)));
  view.dom.blur();
  return true;
}

/**
 * G198: `NAVIGATE_INTO` (⌘→) / `NAVIGATE_OUT` (⌘←) are the official ids behind the two arrow
 * chords; the collected panel prints them as 进入／退出. The local meaning of the chord is the
 * word jump (G1553), so the command *is* that jump — the ids exist so the chord is claimed by the
 * keymap table (`KEY_BINDINGS`) and printed in the panel, not only by the inline branch below.
 */
function navigateWord(editor: Editor, direction: 'left' | 'right'): boolean {
  const { state, view } = editor;
  if (!state.selection.empty) return false;
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return false;
  const text = $from.parent.textContent;
  const offset = $from.parentOffset;
  const target =
    direction === 'right' ? nextWordOffset(text, offset) : prevWordOffset(text, offset);
  view.dispatch(
    state.tr.setSelection(TextSelection.create(state.doc, $from.start() + target)),
  );
  // The official build consumes the key even when the caret cannot move (it never leaves the
  // block), which is what keeps the browser's own word jump out of the way.
  return true;
}

/** G198: 「编辑页面区块」 on a selected page block rewrites that block's own title. */
async function renamePageBlock(editor: Editor, pos: number, node: PMNode): Promise<void> {
  const current = node.attrs.title;
  const next = await promptDialog({
    title: '编辑页面区块',
    defaultValue: typeof current === 'string' ? current : '',
    confirmLabel: '保存',
  });
  if (next === null) return;
  const title = next.trim();
  const after = editor.state;
  const target = after.doc.nodeAt(pos);
  if (!target || target.type.name !== 'pageBlock') return;
  editor.view.dispatch(
    after.tr.setNodeMarkup(pos, target.type, { ...target.attrs, title: title || null }),
  );
}

export function applyKeymapAction(editor: Editor, id: string): boolean {
  const style = STYLE_SLOTS[id];
  if (style) return style(editor);

  const target = MOVE_TARGETS[id];
  if (target) {
    // G1548/G1549: with a plain caret these keys move the caret, not the block. Only a block
    // selection (NodeSelection) gives them the "move this block" meaning.
    if (!(editor.state.selection instanceof NodeSelection)) {
      const state = editor.state;
      const doc = state.doc;
      const sel = state.selection;
      const index = topLevelIndexOf(doc, sel.from);
      if (index < 0) return false;
      const nextIndex =
        target === 'up' ? Math.max(0, index - 1)
          : target === 'down' ? Math.min(doc.childCount - 1, index + 1)
            : target === 'top' ? 0
              : doc.childCount - 1;
      if (nextIndex === index) return false;
      const pos = topLevelStart(doc, nextIndex) + 1;
      editor.view.dispatch(
        state.tr.setSelection(TextSelection.create(doc, Math.min(pos, doc.content.size))).scrollIntoView(),
      );
      return true;
    }
    const tr = buildBlockMove(editor.state, target);
    if (!tr) return false;
    editor.view.dispatch(tr);
    return true;
  }

  if (id === 'DUPLICATE') return duplicateTopBlock(editor);

  // G1582: the official inline chords toggle the same marks the punctuation forms do.
  if (id === 'STRIKE_INLINE') return editor.chain().focus().toggleStrike().run();
  if (id === 'HIGHLIGHT_INLINE') return editor.chain().focus().toggleHighlight().run();
  if (id === 'CODE_INLINE') return editor.chain().focus().toggleCode().run();
  // G1588 / G1594: 组合与取消组合。组合＝把选中的顶层块包进卡片；取消组合照官方 REST 定案
  // 降级成「页面块（h3 标题）＋子块」且再按一次不变（首子升标题位、其余子块原地保留）。
  if (id === 'GROUP_BLOCKS') {
    const selection = useBlockSelectStore.getState();
    if (selection.active && selection.indices.length > 1) {
      const grouped = applyGroupIndices(editor.state, editor.view.dispatch, selection.indices);
      selection.clear();
      return grouped;
    }
    return applyGroup(editor.state, editor.view.dispatch);
  }
  if (id === 'UNGROUP_BLOCKS') return applyUngroup(editor.state, editor.view.dispatch);

  // G1584：页面块是子文档的指针；键位只插占位预览，点它才建子页（page-block-view）。
  if (id === 'PAGE') return editor.chain().focus().setPageBlock().run();

  // G1584：`Ctrl-Shift-L` 打开「配置卡片」面板，宿主在 Editor 里。
  if (id === 'CARD') {
    const index = topLevelIndexOf(editor.state.doc, editor.state.selection.from);
    if (index < 0) return false;
    useCardConfigStore.getState().ask(index);
    return true;
  }

  // G1584：两枚装饰键在「无装饰」与第一档颜色之间切换。官方只读到块 rect 位移，
  // 本地落在已有的 focusColor／shadedColor 上（面板与 CSS 是同一套属性）。
  if (id === 'FOCUS_DECOR' || id === 'BLOCK_DECOR') {
    const kind = id === 'FOCUS_DECOR' ? 'focus' : 'block';
    const decorations = decorationAt(editor.state);
    const current = kind === 'focus' ? decorations.focus : decorations.block;
    const next = toggledDecoration(current);
    const chain = editor.chain().focus();
    if (kind === 'focus') chain.setFocusStyle(next).run();
    else chain.setShadedStyle(next).run();
    return true;
  }

  // 两枚「标记取消」是同一命令的第二条通路（Mac `⌘⌥⇧T` 与 `⌘⌥/`），分派到同一处。
  if (id === 'SET_CANCELLED' || id === 'SET_CANCELLED_SLASH') {
    return toggleTaskCancelledAtSelection(editor.state, editor.view.dispatch, new Date());
  }

  // The four find chords: `⌘F` opens the panel in **find-only** tier, `⌘⇧F` unrolls the replacement
  // field too (G1570 — the official split: `Ctrl-F` leaves `replaceInput:0`, `Ctrl-Shift-F` shows
  // it). `⌘G` / `⌘⇧G` walk the matches. They are consumed even when nothing matched: leaving the key
  // to the browser would raise the browser's own find bar, which is not what the key means here.
  if (id === 'FIND_IN_PAGE') {
    useFindReplaceStore.getState().openWith(false);
    return true;
  }
  if (id === 'REPLACE_IN_PAGE') {
    useFindReplaceStore.getState().openWith(true);
    return true;
  }
  if (id === 'FIND_NEXT') {
    editor.commands.findRefresh();
    editor.commands.findNext();
    return true;
  }
  if (id === 'FIND_PREVIOUS') {
    editor.commands.findRefresh();
    editor.commands.findPrevious();
    return true;
  }

  // `⇧⏎` renames the page block **when a block is selected**; a plain text caret means the
  // line-break branch above already claimed it (G1552). This build has no page-block node
  // (G53/G1408) — the document title input is the page title, so that is the rename target.
  if (id === 'RENAME') {
    const selection = editor.state.selection as { node?: PMNode; from?: number };
    if (!selection.node) return false;
    // G198: 「编辑页面区块」 is a **block-level** rename. A page block carries its own `title`
    // attribute, so with one selected the target is that block, not the document title.
    if (selection.node.type.name === 'pageBlock' && typeof selection.from === 'number') {
      void renamePageBlock(editor, selection.from, selection.node);
      return true;
    }
    if (typeof document === 'undefined' || !document.querySelector('[data-document-title]')) return false;
    useTitleRequestStore.getState().ask();
    return true;
  }

  if (id === 'NAVIGATE_INTO') return navigateWord(editor, 'right');
  if (id === 'NAVIGATE_OUT') return navigateWord(editor, 'left');

  // `⌘⇧M` asks for a comment on the block holding the caret. The request store
  // opens the info panel's composer, the same path the block menu uses (G1470).
  if (id === 'COMMENT') {
    const index = topLevelIndexOf(editor.state.doc, editor.state.selection.from);
    if (index < 0) return false;
    useCommentRequestStore.getState().ask(editor.state.doc.child(index).textContent);
    return true;
  }

  // G253: the task schedule / deadline command groups. Each writes the task item's date field;
  // `.clear` nulls it. The groups are parallel but asymmetric — only `schedule` has the dynamic
  // `.x` phrase (handled by the command palette's dynamic slot, not here).
  if (id.startsWith('commands.task.schedule') || id.startsWith('commands.task.deadline')) {
    const field = id.startsWith('commands.task.schedule') ? 'scheduleDate' : 'dueDate';
    const index = topLevelIndexOf(editor.state.doc, editor.state.selection.from);
    if (index < 0) return false;
    if (id.endsWith('.clear')) {
      setTaskDateField(editor.state, editor.view.dispatch, index, field, null);
      return true;
    }
    // The fixed-phrase commands land on a concrete day.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offset = id.endsWith('.for.tomorrow')
      ? 1
      : id.endsWith('.next.monday')
        ? (8 - today.getDay()) % 7 || 7
        : 0;
    const target = new Date(today.getTime() + offset * 86_400_000);
    setTaskDateField(editor.state, editor.view.dispatch, index, field, localDayInstant(target));
    return true;
  }

  // Anything else in the table belongs to the shell (sidebar, daily note) or to a gap that is
  // still open (focus mode, the shortcuts panel, the comment panel): returning false here keeps
  // the event unclaimed so those layers can take it, and never fakes a binding that does nothing.
  return false;
}

/** How deep the caret sits inside list items (0 when not in a list). */
function listDepthOf(resolved: { depth: number; node: (depth: number) => { type: { name: string } } }): number {
  let depth = 0;
  for (let level = resolved.depth; level > 0; level -= 1) {
    if (resolved.node(level).type.name === 'listItem') depth += 1;
  }
  return depth;
}

/**
 * The block's own sibling context (G628). The official chain reads the container's `subblocks`,
 * so "the previous block" is the previous child of *the same parent* — for a top-level block that
 * is the parent container (`$from.node(0)`), for a nested one it is the enclosing node.
 */
function siblingContext(
  $from: { depth: number; node: (depth: number) => PMNode; index: (depth: number) => number },
): { container: PMNode; index: number; siblings: PMNode[] } {
  const container = $from.node($from.depth - 1);
  const index = $from.index($from.depth - 1);
  const siblings: PMNode[] = [];
  for (let i = 0; i < container.childCount; i += 1) siblings.push(container.child(i));
  return { container, index, siblings };
}

export const CraftKeymap = Extension.create({
  name: 'craftKeymap',

  addStorage() {
    return { selectEdgeHandler: null as ((event: KeyboardEvent) => void) | null };
  },

  /**
   * G1599：这组弦要在 ProseMirror 默认键位之前吃掉——`selectTextUp/Down` 是 core keymap
   * 的行为，挂在 `handleKeyDown` 里会与插件顺序赛跑，所以用编辑器 DOM 的捕获阶段。
   */
  onCreate() {
    const handler = (event: KeyboardEvent) => {
      // G517：TipTap 内置把 `Mod-Shift-7` 绑成编号列表，会抢在官方 `Ctrl-Shift-7＝折叠列表`
      // 之前；这条冲突必须在捕获阶段截下，否则段落永远变不成折叠块。
      if (
        detectPlatform() !== 'mac' &&
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.code === 'Digit7'
      ) {
        event.preventDefault();
        event.stopPropagation();
        applyToggleList({
          state: this.editor.state,
          dispatch: (tr) => this.editor.view.dispatch(tr),
          chain: () => this.editor.chain(),
        });
        return;
      }
      const action = selectToEdgeAction(
        {
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          isComposing: event.isComposing,
        },
        detectPlatform(),
      );
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (action === 'blur') this.editor.view.dom.blur();
    };
    this.storage.selectEdgeHandler = handler;
    this.editor.view.dom.addEventListener('keydown', handler, true);
  },

  onDestroy() {
    const handler = this.storage.selectEdgeHandler;
    if (handler) this.editor.view.dom.removeEventListener('keydown', handler, true);
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: CRAFT_KEYMAP_KEY,
        // `handleKeyDown` is a *prop*: written at the top level of the Plugin spec it is not an
        // error, it is simply never consulted — the plugin stays registered, the editor stays
        // focused, and no key ever reaches the handler.
        props: {
          handleKeyDown(view: EditorView, event: KeyboardEvent) {
            // G490: while an IME is composing (`keyCode 229` / `isComposing`), the official build
            // skips the **whole** dispatch — the candidate window owns Esc/Enter. Without this the
            // local editor would close a popup or split a block mid-composition.
            if (isImeComposing(event)) return false;
            // G1579: Ctrl/⌘-G with a text selection opens the find panel (the block-select state,
            // which is where the same chord groups blocks, does not exist locally — see G1588).
            if (
              (event.key === 'g' || event.key === 'G') &&
              (event.metaKey || event.ctrlKey) &&
              !event.shiftKey &&
              !event.altKey
            ) {
              const { from, to } = view.state.selection;
              // G1588: the block-select state is a node selection, and that is where the same
              // chord groups blocks — so the find panel only claims *text* selections.
              const isTextSelection = !(view.state.selection instanceof NodeSelection);
              if (from !== to && isTextSelection) {
                event.preventDefault();
                event.stopPropagation();
                useFindReplaceStore.getState().openWith(false);
                return true;
              }
            }
            // G1586: Ctrl/⌘-K over a selection opens the link input instead of the command palette.
            if (
              (event.key === 'k' || event.key === 'K') &&
              (event.metaKey || event.ctrlKey) &&
              !event.shiftKey &&
              !event.altKey
            ) {
              const { from, to } = view.state.selection;
              if (from !== to) {
                event.preventDefault();
                event.stopPropagation();
                void promptDialog({ title: 'URL', placeholder: 'https://…', confirmLabel: '设置' }).then((href) => {
                  if (href == null || !href.trim()) return;
                  editor.chain().focus().setLink({ href: href.trim() }).run();
                });
                return true;
              }
            }
            // G1578: Ctrl/⌘-Shift-M comments on the selection; the composer lives in the info panel.
            if (
              (event.key === 'm' || event.key === 'M') &&
              (event.metaKey || event.ctrlKey) &&
              event.shiftKey &&
              !event.altKey
            ) {
              const { from, to } = view.state.selection;
              if (from === to) return false;
              const selected = view.state.doc.textBetween(from, to, ' ');
              useCommentRequestStore.getState().ask(selected.slice(0, 500));
              useRightPanelStore.getState().open('info');
              return true;
            }
            // G1581: Ctrl/⌘-Shift-E turns the selection into an inline equation.
            if (
              (event.key === 'e' || event.key === 'E') &&
              (event.metaKey || event.ctrlKey) &&
              event.shiftKey &&
              !event.altKey
            ) {
              const { from, to } = view.state.selection;
              if (from === to) return false;
              void promptDialog({ title: '输入方程', placeholder: 'x^2', confirmLabel: '插入' }).then((latex) => {
                if (latex == null || !latex.trim()) return;
                editor.chain().focus().setInlineMath({ latex: latex.trim() }).run();
              });
              return true;
            }
            // G211: Ctrl+Z / Ctrl+Shift+Z are gated on where the focus actually is. When the caret
            // sits in an inline sub-editor (math), the key belongs to that editor, not the document
            // — so the document's undo is skipped and the sub-editor keeps its own stack.
            if (
              (event.key === 'z' || event.key === 'Z') &&
              (event.metaKey || event.ctrlKey) &&
              !event.altKey
            ) {
              const target = event.target as HTMLElement | null;
              const inSubEditor = Boolean(target?.closest('input, textarea, [data-sub-editor]'));
              if (inSubEditor) return false;
            }
            // G777: inside the editor Mod+K inserts a link — it must not fall through to the
            // shell's command palette, which owns the same chord on the browse screens.
            if (
              (event.key === 'k' || event.key === 'K') &&
              (event.metaKey || event.ctrlKey) &&
              !event.altKey &&
              !event.shiftKey
            ) {
              event.preventDefault();
              requestLink();
              return true;
            }
            // G1583/G633: Escape steps out one layer. Block selection → leave the editor; a multi-cell
            // table selection → the single cell under the caret (official `singleCellSelection`);
            // a text range or one-cell selection → collapse to a caret; a bare caret → select the
            // block it sits in.
            if (
              event.key === 'Escape' &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              !event.shiftKey
            ) {
              const state = view.state;
              const cellSelection =
                state.selection instanceof CellSelection ? state.selection : null;
              // A caret inside a cell has no CellSelection yet; resolve the cell that holds it so
              // the first rung can still land on `singleCellSelection`.
              let cellAnchorPos: number | null = null;
              if (cellSelection) {
                cellAnchorPos = cellSelection.$anchorCell.pos;
              } else {
                for (let depth = state.selection.$from.depth; depth > 0; depth -= 1) {
                  if (state.selection.$from.node(depth).type.spec.tableRole === 'cell') {
                    cellAnchorPos = state.selection.$from.before(depth);
                    break;
                  }
                }
              }
              const rung = escapeRung({
                blockSelected: state.selection instanceof NodeSelection,
                inTableCell: cellAnchorPos !== null,
                singleCellSelected: cellSelection !== null && cellSelection.ranges.length === 1,
                hasRange: !state.selection.empty,
              });
              if (rung === 'leave') {
                event.preventDefault();
                useBlockSelectStore.getState().clear();
                view.dom.blur();
                return true;
              }
              if (rung === 'table-cell' && cellAnchorPos !== null) {
                // Official `Ft.singleCellSelection(…coordinateOfCell(cellId), tableId)`: the
                // multi-cell selection collapses to the cell the anchor sits in.
                view.dispatch(
                  state.tr.setSelection(CellSelection.create(state.doc, cellAnchorPos)),
                );
                event.preventDefault();
                return true;
              }
              if (rung === 'collapse') {
                // Official `eo.select({focus, anchor: focus})`: the range becomes a caret at the
                // **focus** end (ProseMirror's `head`), not at the block boundary.
                view.dispatch(
                  state.tr.setSelection(TextSelection.near(state.doc.resolve(state.selection.head), -1)).scrollIntoView(),
                );
                event.preventDefault();
                return true;
              }
              const index = topLevelIndexOf(state.doc, state.selection.from);
              if (index >= 0) {
                const start = topLevelStart(state.doc, index);
                view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, start)));
                // G1588: the block-select state remembers which block the ladder started from.
                useBlockSelectStore.getState().begin(index);
                event.preventDefault();
                return true;
              }
              return false;
            }
            // G1588: `Shift-↑/↓` extends the block selection (the official ladder needs the
            // expansion before `Ctrl-G` can merge anything).
            if (
              event.shiftKey &&
              (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey
            ) {
              const selection = useBlockSelectStore.getState();
              if (selection.active && selection.indices.length > 0) {
                const anchor = selection.indices[selection.indices.length - 1];
                const next = event.key === 'ArrowUp' ? anchor - 1 : anchor + 1;
                if (next >= 0 && next < view.state.doc.childCount) {
                  selection.extend(next);
                  const start = topLevelStart(view.state.doc, next);
                  view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, start)));
                  event.preventDefault();
                  return true;
                }
              }
            }
            // G1550: Ctrl/⌘-A is a two-step ladder — first select the current block's text,
            // then (on the same chord again) turn that block into a node selection.
            if (
              (event.key === 'a' || event.key === 'A') &&
              (event.metaKey || event.ctrlKey) &&
              !event.shiftKey &&
              !event.altKey
            ) {
              const state = view.state;
              const doc = state.doc;
              if (!(state.selection instanceof NodeSelection)) {
                const index = topLevelIndexOf(doc, state.selection.from);
                if (index >= 0) {
                  const node = doc.child(index);
                  const start = topLevelStart(doc, index);
                  if (node.isTextblock) {
                    const textFrom = start + 1;
                    const textTo = start + 1 + node.content.size;
                    const alreadyText =
                      state.selection.from === textFrom && state.selection.to === textTo;
                    if (!alreadyText && node.content.size > 0) {
                      view.dispatch(
                        state.tr.setSelection(TextSelection.create(doc, textFrom, textTo)).scrollIntoView(),
                      );
                      return true;
                    }
                  }
                  view.dispatch(state.tr.setSelection(NodeSelection.create(doc, start)));
                  return true;
                }
              }
            }
            // G1591: Space on a block selection inserts a block after it (text carets keep the
            // space character, as in the text-editing state).
            if (
              (event.key === ' ' || event.key === 'Spacebar') &&
              !event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              view.state.selection instanceof NodeSelection
            ) {
              const sel = view.state.selection as NodeSelection;
              const paragraph = view.state.schema.nodes.paragraph.create();
              const tr = view.state.tr.insert(sel.to, paragraph);
              tr.setSelection(TextSelection.create(tr.doc, sel.to + 1)).scrollIntoView();
              view.dispatch(tr);
              return true;
            }
            // G1554: Mod+Shift+Home/End enters **block selection** (the first/last top-level
            // block becomes a node selection and focus leaves the editor), rather than selecting
            // text to the document edge.
            if (
              (event.key === 'Home' || event.key === 'End') &&
              event.shiftKey &&
              (event.metaKey || event.ctrlKey) &&
              !event.altKey
            ) {
              const doc = view.state.doc;
              const index = event.key === 'Home' ? 0 : doc.childCount - 1;
              if (index >= 0) {
                const pos = event.key === 'Home' ? 0 : topLevelStart(doc, index);
                view.dispatch(view.state.tr.setSelection(NodeSelection.create(doc, pos)));
                (view.dom as HTMLElement).blur?.();
                return true;
              }
            }
            // G1553: Mod+←/→ is word-level navigation, lands on the word *end* going forward,
            // never leaves the block, and — unlike the browser default — consumes the key.
            if (
              (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
              (event.metaKey || event.ctrlKey) &&
              !event.shiftKey &&
              !event.altKey
            ) {
              // G198: the same two chords are the `NAVIGATE_INTO` / `NAVIGATE_OUT` commands.
              return navigateWord(editor, event.key === 'ArrowRight' ? 'right' : 'left');
            }
            // G1552: Shift-Enter inserts a line break inside the block (four independent official
            // runs; the older "inert" reading G615 was withdrawn). A selected block still routes
            // to RENAME below, which is the only other meaning this chord has locally.
            if (
              event.key === 'Enter' &&
              event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              !(view.state.selection instanceof NodeSelection)
            ) {
              editor.chain().focus().setHardBreak().run();
              return true;
            }
            // G570/G577/G578: Enter on an **empty** block steps one format level down before it
            // splits — indent → list → decoration. Only when nothing is left to step down from
            // does the default split run.
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              view.state.selection.empty
            ) {
              const { $from } = view.state.selection;
              if ($from.parent.isTextblock) {
                // G577: Enter's two branches are named by emptiness — an **empty** block walks the
                // three-step format chain; a non-empty one splits into two blocks. Without this
                // guard a paragraph with text would step its indent down instead of splitting.
                const empty = isEmptyBlock({
                  textLength: $from.parent.textContent.length,
                  atomicInlines: countAtomicInlines($from.parent),
                  childBlocks: 0,
                });
                if (!empty) return false;
                const step = nextFormatStep({
                  indentLevel: Number($from.parent.attrs?.indent ?? 0),
                  inList: listDepthOf($from) > 0,
                  // G570: the third step clears a decoration (focus colour / block colour).
                  decorated: hasDecoration($from.parent.attrs as Record<string, unknown>),
                });
                if (step === 'indent') {
                  editor.chain().focus().updateAttributes($from.parent.type.name, {
                    indent: Math.max(0, Number($from.parent.attrs?.indent ?? 0) - 1),
                  }).run();
                  return true;
                }
                if (step === 'list') {
                  editor.chain().focus().liftListItem('listItem').run();
                  return true;
                }
                if (step === 'decoration') {
                  // G570: clear both decoration attributes — the "block" and "focus" slots.
                  editor
                    .chain()
                    .focus()
                    .updateAttributes($from.parent.type.name, { focusColor: null, backgroundColor: null, textColor: null })
                    .run();
                  return true;
                }
              }
            }
            // G1576/G1577: with the caret in a table cell, Ctrl-Enter adds a row and
            // Ctrl-Shift-Enter / Ctrl-Alt-Enter add a column (the measured keys of table E).
            const tableAxis = editor.isActive('table') ? tableAxisForShortcut(event) : null;
            if (tableAxis) {
              const dimensions = tableDimensions(editor);
              if (dimensions) {
                const rows = tableAxis === 'row' ? dimensions.rows + 1 : dimensions.rows;
                const columns = tableAxis === 'row' ? dimensions.columns : dimensions.columns + 1;
                if (!tableSizeAllowed(rows, columns)) {
                  toast.add({
                    id: 'table-size-limit',
                    type: 'error',
                    title: tableLimitToastTitle(tableAxis === 'row' ? 'row' : 'column', rows),
                    description: TABLE_SIZE_LIMIT_SUBTITLE,
                    timeout: TABLE_SIZE_LIMIT_DURATION,
                  });
                  return true;
                }
              }
              const ran = tableAxis === 'row'
                ? editor.chain().focus().addRowAfter().run()
                : tableAxis === 'column-before'
                  ? editor.chain().focus().addColumnBefore().run()
                  : editor.chain().focus().addColumnAfter().run();
              if (ran) return true;
            }
            // G381: a plain Enter that **splits** a block closes the undo group, so the newline
            // does not merge with the typing that follows it. Locally the history is ProseMirror's
            // time-window group (500ms); without this boundary `输入 → Enter → 输入` collapses into
            // one step, while the official build keeps the split as its own boundary.
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              view.state.selection.empty &&
              !(view.state.selection instanceof CellSelection)
            ) {
              const { $from } = view.state.selection;
              if ($from.parent.isTextblock && !isEmptyBlock({ textLength: $from.parent.textContent.length, atomicInlines: countAtomicInlines($from.parent), childBlocks: 0 })) {
                const split = editor.chain().focus().splitBlock().run();
                if (split) {
                  view.dispatch(closeHistory(view.state.tr));
                  return true;
                }
              }
            }
            // Enter adds a row only while cells are selected and no text is being edited (G1478).
            // A caret inside a cell is editing, so Enter there keeps its normal meaning.
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              view.state.selection instanceof CellSelection
            ) {
              // G659: Enter adds a row only while the table is still under 50 rows / 750 cells.
              const dimensions = tableDimensions(editor);
              if (dimensions && !tableSizeAllowed(dimensions.rows + 1, dimensions.columns)) {
                toast.add({
                  id: 'table-size-limit',
                  type: 'error',
                  title: tableLimitToastTitle('row', dimensions.rows + 1),
                  description: TABLE_SIZE_LIMIT_SUBTITLE,
                  timeout: TABLE_SIZE_LIMIT_DURATION,
                });
                return true;
              }
              editor.chain().focus().addRowAfter().run();
              return true;
            }
            // G1590: Enter in a toggle's summary adds the first child block instead of splitting
            // the summary and dissolving the toggle; a closed toggle opens so the caret is visible.
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              view.state.selection.empty
            ) {
              const target = toggleSummaryTarget(view.state);
              if (target) {
                const toggle = view.state.doc.nodeAt(target.togglePos);
                if (toggle) {
                  view.dispatch(
                    view.state.tr.setNodeMarkup(target.togglePos, undefined, {
                      ...toggle.attrs,
                      open: true,
                    }),
                  );
                }
                const tr = view.state.tr.insert(
                  target.insertPos,
                  view.state.schema.nodes.paragraph.create(),
                );
                tr.setSelection(TextSelection.create(tr.doc, target.selectPos)).scrollIntoView();
                view.dispatch(tr);
                return true;
              }
            }
            // G1593: Ctrl/⌘-Alt-T toggles every toggle block. When the document has none the
            // key stays inert, which is why the official binding does not change state every press.
            if (
              event.key.toLowerCase() === 't' &&
              (event.metaKey || event.ctrlKey) &&
              event.altKey &&
              !event.shiftKey
            ) {
              const next = nextOpenForAllToggles(view.state);
              if (next !== null) {
                const tr = view.state.tr;
                if (setOpenOnAllToggles(view.state, tr, next) > 0) view.dispatch(tr.scrollIntoView());
                return true;
              }
            }
            // G1620: Ctrl/⌘-Backspace inside a table cell clears the cell's content — the
            // official DELETE_ROWS binding is "empty this cell", not "delete the row".
            if (
              event.key === 'Backspace' &&
              (event.metaKey || event.ctrlKey) &&
              !event.shiftKey &&
              !event.altKey &&
              editor.isActive('table') &&
              clearCellContents(editor)
            ) {
              return true;
            }
            // G632: `Delete` (⌦) is Backspace's **stunted mirror** — same "caret at block end"
            // gate, but only two steps (empty block ⇒ delete self + select next; next is text ⇒
            // join forward) and **no** list/indent/decoration chain (that is Backspace's alone).
            if (
              event.key === 'Delete' &&
              !event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              view.state.selection.empty
            ) {
              const { $from } = view.state.selection;
              if ($from.parent.isTextblock) {
                const index = topLevelIndexOf(view.state.doc, view.state.selection.from);
                const hasNext = index >= 0 && index < view.state.doc.childCount - 1;
                const next = hasNext ? view.state.doc.child(index + 1) : null;
                const step = deleteStepFor({
                  collapsed: true,
                  atBlockEnd: $from.parentOffset === $from.parent.content.size,
                  blockEmpty: $from.parent.content.size === 0,
                  nextIsText: next?.type.name === 'paragraph' || next?.type.name === 'heading',
                  hasNext,
                });
                if (step === 'delete-self') {
                  const start = topLevelStart(view.state.doc, index);
                  const self = view.state.doc.child(index);
                  // 删掉自己后，下一块正好落在 `start` 处 ⇒ 节点选区就建在 `start`（官方那档的
                  // "删自己并把选区落到下一块"）。
                  const tr = view.state.tr.delete(start, start + self.nodeSize);
                  const next = tr.doc.nodeAt(start);
                  if (next) tr.setSelection(NodeSelection.create(tr.doc, start));
                  view.dispatch(tr.scrollIntoView());
                  return true;
                }
                if (step === 'join-forward') {
                  return editor.chain().focus().joinForward().run();
                }
              }
            }
            // G580：光标落在**原子内联元素**内部（官方 `Wc(r) != null`，四类 `math/day/mention/tag`）
            // 时，Backspace 直接让位默认行为——原子是节点，不是可逐字退格的文本；不让位会先走
            // 下面那条「块首」链，把整块的格式链或整块删掉，与官方行为不一样。
            if (event.key === 'Backspace' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
              const { $from } = view.state.selection;
              if (caretInsideAtom($from.parent.type.name, $from.nodeBefore, $from.nodeAfter)) {
                return false;
              }
            }
            // G578/G585: Backspace at the very start of a block walks the official six-step chain
            // (list → indent → decoration, then the four block-level steps). Only the first two
            // format steps are drivable here; the rest fall through to ProseMirror's own
            // joinBackward, which is the local equivalent of the merge steps.
            if (
              event.key === 'Backspace' &&
              !event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              view.state.selection.empty
            ) {
              const { $from } = view.state.selection;
              if ($from.parentOffset === 0 && $from.parent.isTextblock) {
                const { container, index, siblings } = siblingContext($from);
                const step = nextBackspaceStep({
                  block: {
                    indentLevel: Number($from.parent.attrs?.indent ?? 0),
                    inList: listDepthOf($from) > 0,
                    decorated: hasDecoration($from.parent.attrs as Record<string, unknown>),
                  },
                  blockEmpty: isEmptyBlock({
                    textLength: $from.parent.textContent.length,
                    atomicInlines: countAtomicInlines($from.parent),
                    childBlocks: $from.parent.childCount,
                  }),
                  hasPrevious: index > 0,
                  previous: previousSibling(siblings, index),
                });
                if (step === 'list') {
                  if (editor.isActive('taskList')) return editor.chain().focus().liftListItem('taskItem').run();
                  return editor.chain().focus().liftListItem('listItem').run();
                }
                if (step === 'indent') {
                  return editor.chain().focus().updateAttributes($from.parent.type.name, {
                    indent: Math.max(0, Number($from.parent.attrs?.indent ?? 0) - 1),
                  }).run();
                }
                if (step === 'decoration') {
                  // G570: the third step clears both decoration attributes.
                  return editor
                    .chain()
                    .focus()
                    .updateAttributes($from.parent.type.name, { focusColor: null, backgroundColor: null, textColor: null })
                    .run();
                }
                // G578 step 5: a previous block that is an **empty text block** is removed
                // outright — ProseMirror's joinBackward would instead merge into it and leave the
                // caret in an empty block, which is not what the official chain does.
                if (step === 'delete-previous' && index > 0) {
                  const start = $from.before($from.depth);
                  const prev = container.child(index - 1);
                  view.dispatch(view.state.tr.delete(start - prev.nodeSize, start));
                  return true;
                }
                // G578 step 6: merge into a previous text block. The official rule picks which
                // side's style survives (G585's four-way winner); locally the merge itself is
                // ProseMirror's joinBackward, and the winner decides whether the merged block
                // keeps this block's style or the previous one's.
                if (step === 'merge-into-previous' && index > 0) {
                  const start = $from.before($from.depth);
                  const prev = container.child(index - 1);
                  const current = container.child(index);
                  const winner = mergeStyleWinner(
                    {
                      textContent: prev.textContent,
                      isListItem: prev.type.name === 'listItem' || prev.type.name === 'taskItem',
                      childBlocks: prev.childCount,
                    },
                    {
                      textContent: current.textContent,
                      isListItem: current.type.name === 'listItem' || current.type.name === 'taskItem',
                      childBlocks: current.childCount,
                    },
                  );
                  const join = editor.chain().focus().joinBackward();
                  // G578 step 6's redo selection: `textSelectionIndex` at the previous block's own
                  // text length — the caret lands at the end of the previous block. `joinBackward`
                  // usually leaves it there, but the official rule states it explicitly, so a block
                  // whose own join put the caret elsewhere still ends up at that same index.
                  const placeCaret = () => {
                    const caret = mergeCaretIndex(prev.textContent.length);
                    if (caret < 0) return;
                    const prevStart = start - prev.nodeSize;
                    const position = prevStart + 1 + caret;
                    if (position <= view.state.doc.content.size) {
                      view.dispatch(
                        view.state.tr.setSelection(TextSelection.create(view.state.doc, position)),
                      );
                    }
                  };
                  // The previous block wins ⇒ after joining, re-assert its node type so the
                  // merged block carries the winning style rather than whatever joinBackward left.
                  if (winner === 'previous' && prev.type.name !== current.type.name) {
                    const prevStart = start - prev.nodeSize;
                    const applied = join.run();
                    if (applied) {
                      const merged = view.state.doc.nodeAt(prevStart);
                      if (merged && merged.type.name !== prev.type.name) {
                        view.dispatch(
                          view.state.tr.setNodeMarkup(prevStart, prev.type, prev.attrs),
                        );
                      }
                      placeCaret();
                    }
                    return applied;
                  }
                  const applied = join.run();
                  if (applied) placeCaret();
                  return applied;
                }
                // G628 step 4: no previous sibling — an empty block deletes itself, a non-empty
                // one does nothing (the model returns null for that arm, so this branch is only
                // reached when the block is empty). "First sibling" is read from the block's own
                // container, so a nested empty block deletes itself too, not just a top-level one.
                if (step === 'delete-self') {
                  // A container must keep a child — the document's only block and the only child
                  // of a nested container are not deletable — so those fall through.
                  if (index !== 0 || container.childCount <= 1) return false;
                  const self = container.child(0);
                  const start = $from.before($from.depth);
                  const tr = view.state.tr.delete(start, start + self.nodeSize);
                  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(start, tr.doc.content.size))));
                  view.dispatch(tr.scrollIntoView());
                  return true;
                }
                // G628 step 7: the previous block is **not** text (an image, a table, a code
                // block) and this block is empty → delete this block and select the previous one.
                // ProseMirror's joinBackward has no merge to fall back on here, so the step is
                // driven locally instead of being left to the default.
                if (step === 'select-previous' && index > 0) {
                  const start = $from.before($from.depth);
                  const prev = container.child(index - 1);
                  const self = container.child(index);
                  const tr = view.state.tr.delete(start, start + self.nodeSize);
                  tr.setSelection(NodeSelection.create(tr.doc, start - prev.nodeSize));
                  view.dispatch(tr.scrollIntoView());
                  return true;
                }
              }
            }
            const binding = KEY_BINDINGS.find((candidate) =>
              matches(
                {
                  metaKey: event.metaKey,
                  ctrlKey: event.ctrlKey,
                  altKey: event.altKey,
                  shiftKey: event.shiftKey,
                  key: event.key,
                  code: event.code,
                },
                candidate,
                detectPlatform(),
              ),
            );
            if (!binding) return false;
            return applyKeymapAction(editor, binding.id);
          },
        },
      }),
    ];
  },
});
