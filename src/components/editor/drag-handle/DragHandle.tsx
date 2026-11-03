'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import {
  ArrowDown, ArrowUp, Ban, Bell, ChevronDown, ChevronRight, ChevronUp, Code, Copy, CreditCard,
  GripVertical, Info, Link2, Maximize2, MessageSquare, Minus, MoreHorizontal, Palette, Plus, Smile, Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dropTargetFor, visibleRows } from './drop-band';
import { resolveDropAddress } from '@/lib/editor/drop-address';
import { indentRunOf } from '@/lib/editor/indent-run';
import { topLevelStart } from '@/lib/editor/block-move';
import { applyBlockAction, anchorableBlockTarget, BLOCK_EMOJIS, blockLinkFor, blockMenuItems, REMIND_MENU, setBlockEmoji, setBlockReminder, setCalloutType, setDividerStyle, setSeparatorMaterial, setTaskReminder, setTaskReminderAt, setBlockReminderAt, taskItemTarget, type BlockActionId } from './block-actions';
import { promptDialog } from '@/lib/dialog/show';
import { CALLOUT_CHOICES, type CalloutType } from '@/components/editor/extensions/callout';
import { DIVIDER_STYLE_CHOICES, type DividerStyle } from '@/lib/editor/divider-styles';
import {
  SEPARATOR_MATERIAL_LABELS,
  WASHI_PATTERN_CHOICES,
  type SeparatorMaterial,
} from '@/lib/editor/separator-material';
import { WASHI_SEPARATOR } from '@/lib/editor/washi-patterns';

/** G1470：块菜单每一项都带图标（官方那族逐项图标）。 */
const BLOCK_ACTION_ICONS: Record<BlockActionId, React.ComponentType<{ className?: string }>> = {
  'add-content': Plus,
  'add-emoji': Smile,
  'add-comment': MessageSquare,
  'convert-card': CreditCard,
  remind: Bell,
  'set-cancelled': Ban,
  'insert-above': ArrowUp,
  'insert-below': ArrowDown,
  'move-up': ChevronUp,
  'move-down': ChevronDown,
  'move-top': ChevronUp,
  'move-bottom': ChevronDown,
  'copy-link': Link2,
  'toggle-open': ChevronRight,
  'divider-style': Minus,
  'callout-type': Info,
  'code-language': Code,
  'code-theme': Palette,
  'code-fullscreen': Maximize2,
  'code-copy': Copy,
  delete: Trash2,
};

function BlockActionIcon({ id }: { id: BlockActionId }) {
  const Icon = BLOCK_ACTION_ICONS[id] ?? Info;
  return <Icon className="mr-2 size-4 text-muted-foreground" />;
}
import { pointerArmDistance, touchArmDelay } from '@/lib/dnd/drag-threshold';
import { dragBackendFor, type DragBackend } from '@/lib/dnd/backend';
import type { RemindPresetId } from '@/lib/task/remind-presets';
import { toast } from '@/components/ui/toast';
import { COPY_LINK_FAILED } from '@/lib/errors/alert-copy';
import { useCommentRequestStore } from '@/lib/store/use-comment-request-store';

interface HandlePosition {
  top: number;
  left: number;
  blockEl: HTMLElement;
}

interface IndicatorPosition {
  top: number;
  visible: boolean;
}

interface DragRange {
  from: number;
  to: number;
  els: HTMLElement[];
}

const HANDLE_OFFSET = -26;

export function DragHandle({ editor, documentId }: { editor: Editor; documentId: string }) {
  const [handle, setHandle] = useState<HandlePosition | null>(null);
  const [indicator, setIndicator] = useState<IndicatorPosition>({ top: 0, visible: false });
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    pointerId: number;
    /** G461: the pointer that started this drag, which fixes the backend for its whole life. */
    pointerType: string;
    backend: DragBackend;
    range: DragRange | null;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * `posAtDOM(el, 0)` resolves to depth 0 for the first top-level block, which used to
   * make the very first block undraggable. Walking the document by child index keeps
   * the range correct for every block.
   */
  const getTopLevelRange = useCallback(
    (el: HTMLElement): { from: number; to: number } | null => {
      const view = editor.view;
      const index = Array.prototype.indexOf.call(view.dom.children, el);
      if (index < 0) return null;

      let pos = 0;
      for (let child = 0; child < view.state.doc.childCount; child += 1) {
        const node = view.state.doc.child(child);
        if (child === index) return { from: pos, to: pos + node.nodeSize };
        pos += node.nodeSize;
      }
      return null;
    },
    [editor]
  );

  const updateHandlePosition = useCallback((blockEl: HTMLElement) => {
    const editorRect = editor.view.dom.getBoundingClientRect();
    const blockRect = blockEl.getBoundingClientRect();
    setHandle({
      top: blockRect.top - editorRect.top,
      left: HANDLE_OFFSET,
      blockEl,
    });
  }, [editor]);

  const indexOfBlock = useCallback(
    (blockEl: HTMLElement): number =>
      Array.prototype.indexOf.call(editor.view.dom.children, blockEl),
    [editor],
  );

  const toggleState = useCallback(
    (blockEl: HTMLElement) => {
      const index = indexOfBlock(blockEl);
      const node = index >= 0 ? editor.state.doc.child(index) : null;
      return {
        isToggle: node?.type.name === 'toggleBlock',
        toggleOpen: node?.attrs.open === true,
      };
    },
    [editor, indexOfBlock],
  );

  // 顶层块可能是 taskItem 本身（导入的扁平文档），也可能是包着它的 taskList。两形都算任务块，
  // 具体作用在哪一行由 `taskItemTarget` 决定（光标那一行优先）。
  const taskTargetOf = useCallback(
    (blockEl: HTMLElement) => {
      const index = indexOfBlock(blockEl);
      return index >= 0 ? taskItemTarget(editor.state, index) : null;
    },
    [editor, indexOfBlock],
  );

  // G252：非任务块（段落／标题）也能挂提醒。`canRemind` 决定「提醒我…」这一枚出不出——
  // 任务块与可寻址块都算，其余块（分隔线、图片等）不给。
  const canRemindBlock = useCallback(
    (blockEl: HTMLElement) => {
      const index = indexOfBlock(blockEl);
      if (index < 0) return false;
      return taskItemTarget(editor.state, index) !== null || anchorableBlockTarget(editor.state, index) !== null;
    },
    [editor, indexOfBlock],
  );

  const isCalloutBlock = useCallback(
    (blockEl: HTMLElement) => {
      const index = indexOfBlock(blockEl);
      return index >= 0 && editor.state.doc.child(index).type.name === 'callout';
    },
    [editor, indexOfBlock],
  );

  const retypeCallout = useCallback(
    (blockEl: HTMLElement, type: CalloutType) => {
      const index = indexOfBlock(blockEl);
      if (index < 0) return;
      setCalloutType(editor.state, editor.view.dispatch, index, type);
    },
    [editor, indexOfBlock],
  );

  const isDividerBlock = useCallback(
    (blockEl: HTMLElement) => {
      const index = indexOfBlock(blockEl);
      return index >= 0 && editor.state.doc.child(index).type.name === 'divider';
    },
    [editor, indexOfBlock],
  );

  // G384/G1440：代码块走它自己那份九项名册。
  const isCodeBlock = useCallback(
    (blockEl: HTMLElement) => {
      const index = indexOfBlock(blockEl);
      return index >= 0 && editor.state.doc.child(index).type.name === 'codeBlock';
    },
    [editor, indexOfBlock],
  );

  const restyleDivider = useCallback(
    (blockEl: HTMLElement, style: DividerStyle) => {
      const index = indexOfBlock(blockEl);
      if (index < 0) return;
      setDividerStyle(editor.state, editor.view.dispatch, index, style);
    },
    [editor, indexOfBlock],
  );

  // G1247：材质轴（line/washi ＋ 图案）。`line` 只切材质，图案原样留着。
  const restyleSeparator = useCallback(
    (blockEl: HTMLElement, material: SeparatorMaterial, pattern?: string) => {
      const index = indexOfBlock(blockEl);
      if (index < 0) return;
      setSeparatorMaterial(editor.state, editor.view.dispatch, index, material, pattern);
    },
    [editor, indexOfBlock],
  );

  const reactToBlock = useCallback(
    (blockEl: HTMLElement, emoji: string) => {
      const index = indexOfBlock(blockEl);
      if (index < 0) return;
      setBlockEmoji(editor.state, editor.view.dispatch, index, emoji);
    },
    [editor, indexOfBlock],
  );

  const remindBlock = useCallback(
    (blockEl: HTMLElement, preset: RemindPresetId) => {
      const index = indexOfBlock(blockEl);
      if (index < 0) return;
      // G252：任务块走 `setTaskReminder`（提醒随任务行投影走），其余可寻址块走 `setBlockReminder`
      // （提醒自己一张表）。两路写的是同一枚 `remindAt` 属性，读方不同。
      if (taskItemTarget(editor.state, index)) {
        setTaskReminder(editor.state, editor.view.dispatch, index, preset, new Date());
      } else {
        setBlockReminder(editor.state, editor.view.dispatch, index, preset, new Date());
      }
    },
    [editor, indexOfBlock],
  );

  const runBlockAction = useCallback(
    (blockEl: HTMLElement, id: BlockActionId) => {
      const index = indexOfBlock(blockEl);
      if (index < 0) return;
      const { state, view } = editor;
      if (index >= state.doc.childCount) return;
      if (id === 'add-comment') {
        useCommentRequestStore.getState().ask(state.doc.child(index).textContent);
        return;
      }
      if (id === 'copy-link') {
        const link = blockLinkFor(state, view.dispatch, index, documentId, () => crypto.randomUUID());
        void navigator.clipboard.writeText(link).then(
          () => toast.add({ title: '已复制区块链接', type: 'success' }),
          () => toast.add({ title: COPY_LINK_FAILED, type: 'error' }),
        );
        return;
      }
      // G1440：代码块的「复制代码」——把那枚块自己的文本写进剪贴板。
      if (id === 'code-copy') {
        const text = state.doc.child(index).textContent;
        void navigator.clipboard.writeText(text).then(
          () => toast.add({ title: '已复制代码', type: 'success' }),
          () => toast.add({ title: '复制失败', type: 'error' }),
        );
        return;
      }
      // 「全屏模式」走代码块自己的全屏视图：向它的 NodeView 发一个事件（组件内监听）。
      if (id === 'code-fullscreen') {
        const node = blockEl;
        node.dispatchEvent(new CustomEvent('craft-code-fullscreen', { bubbles: true }));
        return;
      }
      applyBlockAction(state, view.dispatch, index, id);
      view.focus();
    },
    [editor, indexOfBlock, documentId],
  );

  useEffect(() => {
    const dom = editor.view.dom;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragStateRef.current) return;
      const target = e.target as HTMLElement;
      const block = target.closest('.ProseMirror > *');
      const editorRect = dom.getBoundingClientRect();

      if (block && block instanceof HTMLElement && e.clientX < editorRect.left + 64) {
        updateHandlePosition(block);
      } else {
        setHandle(null);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      // The handle renders in the gutter, outside the editor's own box, so the pointer
      // has to leave `dom` to reach it. Without this guard it hides the moment you
      // move onto it and the block can never be dragged.
      const to = e.relatedTarget as HTMLElement | null;
      if (to?.closest?.('[data-drag-handle]')) return;
      if (!dragStateRef.current) setHandle(null);
    };

    dom.addEventListener('mousemove', handleMouseMove);
    dom.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      dom.removeEventListener('mousemove', handleMouseMove);
      dom.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [editor, updateHandlePosition]);

  const selectBlock = useCallback(
    (blockEl: HTMLElement, extend: boolean) => {
      const range = getTopLevelRange(blockEl);
      if (!range) return;
      const { state, view } = editor;
      const $from = state.doc.resolve(range.from);
      const $to = state.doc.resolve(range.to);

      if (extend) {
        const anchor = state.selection.from;
        const selection =
          range.from >= anchor
            ? TextSelection.create(state.doc, anchor, range.to)
            : TextSelection.create(state.doc, range.from, anchor);
        view.dispatch(state.tr.setSelection(selection).scrollIntoView());
      } else {
        view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, range.from)));
      }
      view.focus();
    },
    [editor, getTopLevelRange]
  );

  const computeDropTarget = useCallback(
    (clientY: number): { el: HTMLElement; pos: number; before: boolean } | null => {
      const dom = editor.view.dom as HTMLElement;
      // G280: the row list is the *visible* siblings. A folded block's children are nested inside
      // it, so they never surface as rows here. Each row is addressed by its **index** and its
      // visibility, and the drop side picks the `beforeAnchorVisible` / `afterAnchorVisible` family
      // — the local form of the official `*Visible` pair (a drop clears a fold, never lands inside).
      const rows = Array.from(dom.children).map((child, index) => {
        const rect = (child as HTMLElement).getBoundingClientRect();
        return { el: child as HTMLElement, index, top: rect.top, bottom: rect.bottom, visible: rect.height > 0 };
      });
      const children = visibleRows(rows);
      const slot = dropTargetFor(clientY, children);
      if (!slot) return null;
      const child = children[slot.index].el;
      const range = getTopLevelRange(child);
      if (!range) return null;
      // Resolve the landing through the address layer so the Visible semantics live in one place.
      const anchorIndex = rows.find((row) => row.el === child)?.index ?? 0;
      const address = {
        kind: slot.before ? ('beforeAnchorVisible' as const) : ('afterAnchorVisible' as const),
        anchorBlockId: String(anchorIndex),
      };
      const landing = resolveDropAddress(
        address,
        rows.map((row) => ({ blockId: String(row.index), visible: row.visible, parentId: 'root' })),
      );
      // The address layer answers with the visible-order position; convert back to a `before` flag
      // against the anchor. A refusal (fold boundary with no visible neighbour) keeps the band's
      // own answer rather than dropping the interaction.
      const before =
        landing?.at === 'sibling' && landing.index !== anchorIndex
          ? landing.index < anchorIndex
          : slot.before;
      return {
        el: child,
        pos: before ? range.from : range.to,
        before,
      };
    },
    [editor, getTopLevelRange]
  );

  const performMove = useCallback(
    (range: DragRange, target: { pos: number; before: boolean }) => {
      const { state, view } = editor;
      const { from, to } = range;

      if (target.pos >= from && target.pos <= to) return;

      const slice = state.doc.slice(from, to);
      let insertPos = target.pos;
      if (insertPos > to) {
        insertPos = target.pos - (to - from);
      }

      const tr = state.tr;
      tr.delete(from, to);
      tr.insert(insertPos, slice.content);
      const $new = tr.doc.resolve(Math.min(insertPos + 1, tr.doc.content.size));
      tr.setSelection(TextSelection.near($new));
      view.dispatch(tr);
      view.focus();
    },
    [editor]
  );

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!handle) return;
      e.preventDefault();

      // ProseMirror replaces block elements whenever the Yjs echo or the autosave
      // transaction lands, so the element captured at hover time can already be
      // detached by the time the pointer goes down. Re-resolve it from the handle's
      // own offset, or the drag silently refuses to arm.
      const dom = editor.view.dom as HTMLElement;
      const wantedTop = dom.getBoundingClientRect().top + handle.top;
      const blockEl = (Array.from(dom.children) as HTMLElement[]).find((child) => {
        const rect = child.getBoundingClientRect();
        return rect.top <= wantedTop && rect.bottom >= wantedTop;
      });
      if (!blockEl) return;

      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        backend: dragBackendFor(e.pointerType),
        range: null,
      };

      const resolveDragRange = (): DragRange | null => {
        const base = getTopLevelRange(blockEl);
        if (!base) return null;

        const { state } = editor;
        const selection = state.selection;
        const isMultiSelection =
          selection.from !== selection.to &&
          selection.from <= base.to &&
          selection.to >= base.from;

        if (isMultiSelection) {
          const from = Math.min(selection.from, selection.to);
          const to = Math.max(selection.from, selection.to);
          const dom = editor.view.dom as HTMLElement;
          const els: HTMLElement[] = [];
          for (const child of Array.from(dom.children) as HTMLElement[]) {
            const childRange = getTopLevelRange(child);
            if (childRange && childRange.from >= from && childRange.to <= to) {
              els.push(child);
            }
          }
          return { from, to, els };
        }

        // G279: the unit that moves is the block **with its indented children** — the run from this
        // block to the first following sibling that is not deeper. `indentRunOf` is that rule; the
        // dragged range then spans the whole run so the children ride along.
        const doc = state.doc;
        const startIndex = Array.prototype.indexOf.call(editor.view.dom.children, blockEl);
        if (startIndex >= 0) {
          const indents = Array.from({ length: doc.childCount }, (_, i) => {
            const raw = doc.child(i).attrs?.indent;
            return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
          });
          const run = indentRunOf(indents, startIndex);
          if (run.end > run.start + 1) {
            const runFrom = topLevelStart(doc, run.start);
            const runTo = topLevelStart(doc, run.end - 1) + doc.child(run.end - 1).nodeSize;
            const dom = editor.view.dom as HTMLElement;
            const els: HTMLElement[] = [];
            for (let i = run.start; i < run.end; i += 1) {
              const el = dom.children[i] as HTMLElement | undefined;
              if (el) els.push(el);
            }
            return { from: runFrom, to: runTo, els };
          }
        }

        return { ...base, els: [blockEl] };
      };

      const handlePointerMove = (ev: PointerEvent) => {
        const st = dragStateRef.current;
        if (!st) return;
        if (!st.range) {
          // G461: which backend drives the drag is decided once, at pointer-down, from the pointer
          // that started it — a touch drag reads the hold column, a mouse drag the movement column
          // (G268). Reading the distance from the same helper the backend picks keeps the two from
          // drifting apart. A touch pointer's movement gate is Infinity, so it never arms here; the
          // hold timer below does.
          // G268：块把手属于官方「无阈值」那一类（`handle`），按下即拖。
          const armAt = pointerArmDistance('handle', st.pointerType);
          const dist = Math.hypot(ev.clientX - st.startX, ev.clientY - st.startY);
          if (dist < armAt) return;
          st.range = resolveDragRange();
        }
        if (!st.range) return;
        setIsDragging(true);
        st.range.els.forEach((el) => el.classList.add('opacity-40'));

        const target = computeDropTarget(ev.clientY);
        if (target) {
          const editorRect = editor.view.dom.getBoundingClientRect();
          const targetRect = target.el.getBoundingClientRect();
          setIndicator({
            top: target.before
              ? targetRect.top - editorRect.top
              : targetRect.bottom - editorRect.top,
            visible: true,
          });
        } else {
          setIndicator((prev) => ({ ...prev, visible: false }));
        }
      };

      const handlePointerUp = (ev: PointerEvent) => {
        const st = dragStateRef.current;
        dragStateRef.current = null;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        setIndicator((prev) => ({ ...prev, visible: false }));
        setIsDragging(false);

        if (!st?.range) {
          selectBlock(blockEl, ev.shiftKey);
          return;
        }

        st.range.els.forEach((el) => el.classList.remove('opacity-40'));
        const target = computeDropTarget(ev.clientY);
        if (target) {
          performMove(st.range, target);
        }
        setHandle(null);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);

      // G461: a touch pointer has no movement gate (`pointerArmDistance` is Infinity), so the hold
      // is what arms it — the Touch backend's own activation. The timer fires only while the finger
      // is still down and no range has been taken yet; a move past the tolerance clears it.
      // G268：把手桶两列都是 0，因此这里拿不到计时器，按下即可拖。
      const holdDelay = touchArmDelay('handle', e.pointerType);
      const holdTimer =
        holdDelay > 0
          ? window.setTimeout(() => {
              const st = dragStateRef.current;
              if (!st || st.range) return;
              st.range = resolveDragRange();
            }, holdDelay)
          : null;
      if (holdTimer !== null) {
        const clearHold = () => window.clearTimeout(holdTimer);
        window.addEventListener('pointerup', clearHold, { once: true });
      }
    },
    [handle, editor, getTopLevelRange, computeDropTarget, performMove, selectBlock]
  );

  if (!handle && !isDragging) return null;

  return (
    <>
      {handle && (
        <div
          className="absolute z-50 flex cursor-grab items-center text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing max-md:hidden"
          style={{
            top: handle.top,
            left: HANDLE_OFFSET,
            height: '24px',
          }}
          onPointerDown={onHandlePointerDown}
          data-drag-handle=""
        >
          <GripVertical className="size-4" />
          <button
            type="button"
            aria-label="在下方插入区块"
            title="在下方插入区块"
            className="rounded-md p-0.5 transition-colors hover:bg-muted hover:text-foreground"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => handle.blockEl && runBlockAction(handle.blockEl, 'insert-below')}
          >
            <Plus className="size-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              aria-label="区块操作"
              title="区块操作"
              className="rounded-md p-0.5 transition-colors hover:bg-muted hover:text-foreground"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[70vh] overflow-y-auto">
              {blockMenuItems({
                canDelete: editor.state.doc.childCount > 1,
                isTask: taskTargetOf(handle.blockEl) !== null,
                taskCancelled: taskTargetOf(handle.blockEl)?.node.attrs.cancelled === true,
                canRemind: canRemindBlock(handle.blockEl),
                ...toggleState(handle.blockEl),
                isDivider: isDividerBlock(handle.blockEl),
                isCallout: isCalloutBlock(handle.blockEl),
                isCodeBlock: isCodeBlock(handle.blockEl),
              }).map((item, index, items) => (
                <Fragment key={item.id}>
                  {index > 0 && items[index - 1].group !== item.group && <DropdownMenuSeparator />}
                  {item.id === 'callout-type' ? (
                  <DropdownMenuSub key={item.id}>
                    <DropdownMenuSubTrigger aria-label={item.label}>
                      <BlockActionIcon id={item.id} />{item.label}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {CALLOUT_CHOICES.map((choice) => (
                        <DropdownMenuItem
                          key={choice.type}
                          onClick={() => retypeCallout(handle.blockEl, choice.type)}
                        >
                          {choice.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : item.id === 'divider-style' ? (
                  <DropdownMenuSub key={item.id}>
                    <DropdownMenuSubTrigger aria-label={item.label}>
                      <BlockActionIcon id={item.id} />{item.label}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {DIVIDER_STYLE_CHOICES.map((choice) => (
                        <DropdownMenuItem
                          key={choice.style}
                          onClick={() => restyleDivider(handle.blockEl, choice.style)}
                        >
                          {choice.label}
                        </DropdownMenuItem>
                      ))}
                      {/* G1247：官方分隔线的材质轴——`--separator washi` ＋ 六档图案。 */}
                      <DropdownMenuSeparator />
                      {WASHI_PATTERN_CHOICES.map((choice) => (
                        <DropdownMenuItem
                          key={choice.name}
                          onClick={() => restyleSeparator(handle.blockEl, WASHI_SEPARATOR, choice.name)}
                        >
                          {SEPARATOR_MATERIAL_LABELS.washi} - {choice.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => restyleSeparator(handle.blockEl, 'line')}>
                        分隔线（普通）
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : item.id === 'add-emoji' ? (
                  <DropdownMenuSub key={item.id}>
                    <DropdownMenuSubTrigger aria-label={item.label}>
                      <BlockActionIcon id={item.id} />{item.label}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {BLOCK_EMOJIS.map((emoji) => (
                        <DropdownMenuItem
                          key={emoji}
                          onClick={() => reactToBlock(handle.blockEl, emoji)}
                        >
                          {emoji}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : item.id === 'remind' ? (
                  <DropdownMenuSub key={item.id}>
                    <DropdownMenuSubTrigger aria-label={item.label}>
                      <BlockActionIcon id={item.id} />{item.label}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {REMIND_MENU.map((preset) => (
                        <DropdownMenuItem
                          key={preset.id}
                          // ☆ 第 120 批后七档**全部有承载面**：五个即时档走 `remindBlock`；
                          // 「自定义…」开一个日期时间对话框写显式时刻；「留着以后用」＝把这枚提醒
                          // 收起来（清 `remindAt`），与官方"进以后桶"同义——本仓没有独立的桶列，
                          // 清掉就是它在这台设备上的等价落点。
                          disabled={false}
                          onClick={() => {
                            if (preset.id === 'custom') {
                              const now = new Date();
                              const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                              void promptDialog({
                                title: '自定义提醒时间',
                                defaultValue: local,
                                placeholder: 'YYYY-MM-DDTHH:mm',
                                confirmLabel: '确定',
                              }).then((value) => {
                                if (!value) return;
                                const at = new Date(value);
                                if (Number.isNaN(at.getTime())) return;
                                const index = indexOfBlock(handle.blockEl);
                                if (index < 0) return;
                                if (taskItemTarget(editor.state, index)) {
                                  setTaskReminderAt(editor.state, editor.view.dispatch, index, at.toISOString());
                                } else {
                                  setBlockReminderAt(editor.state, editor.view.dispatch, index, at.toISOString());
                                }
                              });
                              return;
                            }
                            if (preset.id === 'saveForLater') {
                              const index = indexOfBlock(handle.blockEl);
                              if (index < 0) return;
                              setTaskReminderAt(editor.state, editor.view.dispatch, index, null);
                              return;
                            }
                            remindBlock(handle.blockEl, preset.id);
                          }}
                        >
                          {preset.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : (
                  <DropdownMenuItem
                    key={item.id}
                    aria-label={item.label}
                    onClick={() => runBlockAction(handle.blockEl, item.id)}
                  >
                    <BlockActionIcon id={item.id} />
                    {item.label}
                  </DropdownMenuItem>
                )}
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {indicator.visible && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-40 h-0.5 rounded-full bg-primary/70"
          style={{ top: indicator.top - 1 }}
        >
          <div className="absolute -left-1 -top-[3px] size-2 rounded-full bg-primary/70" />
        </div>
      )}
    </>
  );
}
