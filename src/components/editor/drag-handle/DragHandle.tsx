'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import { GripVertical, MoreHorizontal, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dropTargetFor } from './drop-band';
import { applyBlockAction, BLOCK_EMOJIS, blockLinkFor, blockMenuItems, REMIND_MENU, setBlockEmoji, setCalloutType, setDividerStyle, setTaskReminder, taskItemTarget, type BlockActionId } from './block-actions';
import { CALLOUT_CHOICES, type CalloutType } from '@/components/editor/extensions/callout';
import { DIVIDER_STYLE_CHOICES, type DividerStyle } from '@/lib/editor/divider-styles';
import { DRAG_THRESHOLDS } from '@/lib/dnd/drag-threshold';
import type { RemindPresetId } from '@/lib/task/remind-presets';
import { toast } from '@/components/ui/toast';
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

  const restyleDivider = useCallback(
    (blockEl: HTMLElement, style: DividerStyle) => {
      const index = indexOfBlock(blockEl);
      if (index < 0) return;
      setDividerStyle(editor.state, editor.view.dispatch, index, style);
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
      setTaskReminder(editor.state, editor.view.dispatch, index, preset, new Date());
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
          () => toast.add({ title: '复制失败', type: 'error' }),
        );
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
      const children = Array.from(dom.children) as HTMLElement[];
      const rows = children.map((child) => {
        const rect = child.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      });
      const slot = dropTargetFor(clientY, rows);
      if (!slot) return null;
      const child = children[slot.index];
      const range = getTopLevelRange(child);
      if (!range) return null;
      return {
        el: child,
        pos: slot.before ? range.from : range.to,
        before: slot.before,
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

        return { ...base, els: [blockEl] };
      };

      const handlePointerMove = (ev: PointerEvent) => {
        const st = dragStateRef.current;
        if (!st) return;
        if (!st.range) {
          // G268：通用档＝指针位移 8px 起拖。触摸端的"长按 150ms"档需要计时器，本把手是
          //   悬停才出现的（`mousemove` 驱动），触摸根本到不了这里，故触摸端沿用同一枚位移门限。
          const armAt = DRAG_THRESHOLDS.general.pointerDistance;
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
            <DropdownMenuContent align="start">
              {blockMenuItems({
                canDelete: editor.state.doc.childCount > 1,
                isTask: taskTargetOf(handle.blockEl) !== null,
                taskCancelled: taskTargetOf(handle.blockEl)?.node.attrs.cancelled === true,
                ...toggleState(handle.blockEl),
                isDivider: isDividerBlock(handle.blockEl),
                isCallout: isCalloutBlock(handle.blockEl),
              }).map((item) =>
                item.id === 'callout-type' ? (
                  <DropdownMenuSub key={item.id}>
                    <DropdownMenuSubTrigger>{item.label}</DropdownMenuSubTrigger>
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
                    <DropdownMenuSubTrigger>{item.label}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {DIVIDER_STYLE_CHOICES.map((choice) => (
                        <DropdownMenuItem
                          key={choice.style}
                          onClick={() => restyleDivider(handle.blockEl, choice.style)}
                        >
                          {choice.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : item.id === 'add-emoji' ? (
                  <DropdownMenuSub key={item.id}>
                    <DropdownMenuSubTrigger>{item.label}</DropdownMenuSubTrigger>
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
                    <DropdownMenuSubTrigger>{item.label}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {REMIND_MENU.map((preset) => (
                        <DropdownMenuItem
                          key={preset.id}
                          onClick={() => remindBlock(handle.blockEl, preset.id)}
                        >
                          {preset.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => runBlockAction(handle.blockEl, item.id)}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ),
              )}
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
