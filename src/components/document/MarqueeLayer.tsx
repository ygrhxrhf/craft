'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { escapeKeyDef, focusStack } from '@/lib/focus/focus-stack';
import {
  autoScrollVelocity,
  isMarqueeDrag,
  isMarqueeVetoTarget,
  rectFromPoints,
  sameIdSet,
  type ItemRect,
  type Rect,
} from '@/lib/browse/marquee';
import { hitTest, type MarqueeLayout } from '@/lib/browse/hit-test';

/** G1135 ⑦: the focus-registry entry id the official build uses for the band's Escape. */
const MARQUEE_ESCAPE_ID = 'BrowseSelectionRubberBandEscape';

/** The nearest ancestor that actually scrolls — the official build hands the hook a scroll ref. */
function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = element?.parentElement ?? null;
  while (node) {
    const overflow = getComputedStyle(node).overflowY;
    if (overflow === 'auto' || overflow === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * G1555: drag-marquee selection over the browse items.
 *
 * The overlay is a fixed-position, `pointer-events: none` rectangle — viewport coordinates, as the
 * official one is. G1135 ④/⑤: a press on empty space starts the gesture, the first move past the
 * threshold enters selection mode with the selection cleared, and every later move *replaces* the
 * selection with the hit set.
 *
 * The item rects are measured at hit-test time rather than captured at the press: entering
 * selection mode swaps the toolbar row out, which can move the content a few pixels, and auto-scroll
 * moves it far more. Live rects follow both; a captured snapshot would need to model them.
 */
export function MarqueeLayer({
  containerRef,
  layout,
  selectedIds,
  onStart,
  onChange,
  onCancel,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  /** G1136: the visible layout decides which hit algorithm runs. */
  layout: MarqueeLayout;
  /** G1135 ⑤: the selection the gesture found on entry, so an abandoned gesture can put it back. */
  selectedIds?: readonly string[];
  /** The drag passed the start threshold; the screen should enter selection mode. */
  onStart?: () => void;
  /** The live hit set — the official build replaces the selection with it on every move. */
  onChange?: (ids: string[]) => void;
  /** G1135 ⑤: the gesture was abandoned before it picked anything; restore the pre-gesture selection. */
  onCancel?: (restored: readonly string[]) => void;
}) {
  const [band, setBand] = useState<Rect | null>(null);
  const start = useRef<{ x: number; y: number; started: boolean } | null>(null);
  const pointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scrollParent = useRef<HTMLElement | null>(null);
  const frame = useRef<number | null>(null);
  // G1135 ⑤: the official hook records `new Set(selectedIds)` on pointerdown, before anything is
  // cleared. Keeping it here (not in a render closure) means a mid-drag re-render cannot lose it.
  const preGesture = useRef<readonly string[]>([]);
  const hits = useRef<string[]>([]);
  // The callbacks are re-created on every parent render (selection state changes each move), so
  // they live in a ref — otherwise the listeners would tear down and re-add mid-drag.
  const handlers = useRef({ onStart, onChange, onCancel, layout, selectedIds });
  useEffect(() => {
    handlers.current = { onStart, onChange, onCancel, layout, selectedIds };
  });

  const collect = useCallback((selector: 'data-item-id' | 'data-folder-id'): ItemRect[] => {
    const container = containerRef.current;
    if (!container) return [];
    const attribute = selector === 'data-item-id' ? 'data-item-id' : 'data-folder-id';
    return Array.from(container.querySelectorAll<HTMLElement>(`[${attribute}]`)).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        id: (selector === 'data-item-id' ? element.dataset.itemId : element.dataset.folderId) ?? '',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    });
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // G1555: the press listens on the *scroll* surface, not on the item container — in the list
    // layout the rows fill the container edge to edge, so there is no empty space to press inside
    // it. The official hook takes a `scrollElementRef` for exactly this.
    const gestureTarget = findScrollParent(container) ?? container;
    scrollParent.current = gestureTarget;

    const update = (): boolean => {
      const origin = start.current;
      if (!origin) return false;
      if (!isMarqueeDrag(origin, pointer.current)) return false;
      if (!origin.started) {
        origin.started = true;
        // G1135 ⑦: the official build registers the band's Escape in the focus registry, so a
        // dialog stacked above the gesture takes the key first. `allowPropagation` keeps lower
        // entries reachable for every other key.
        focusStack.push({
          id: MARQUEE_ESCAPE_ID,
          keyDefs: [escapeKeyDef(() => cancel())],
          allowPropagation: true,
        });
        handlers.current.onStart?.();
      }
      const next = rectFromPoints(origin.x, origin.y, pointer.current.x, pointer.current.y);
      setBand(next);
      // G1136: the folder region is a separate hit set in the official build. Locally folders live
      // in the sidebar, outside this container, so that set is always empty.
      const ids = hitTest(next, {
        layout: handlers.current.layout,
        items: collect('data-item-id'),
        folders: collect('data-folder-id'),
      });
      // G1135 ④: the official build skips the write when the hit set did not change (`TVt`).
      if (sameIdSet(new Set(hits.current), ids)) return true;
      hits.current = ids;
      handlers.current.onChange?.(ids);
      return true;
    };

    const autoScroll = () => {
      frame.current = null;
      const parent = scrollParent.current;
      const origin = start.current;
      if (!parent || !origin?.started) return;
      const bounds = parent.getBoundingClientRect();
      // G1135 ③: 30px per frame at most, ramped in over the first 200px past the edge.
      const velocity = autoScrollVelocity(pointer.current.y, bounds.top, bounds.bottom);
      if (velocity !== 0) parent.scrollTop += velocity;
      if (update()) frame.current = requestAnimationFrame(autoScroll);
    };

    const onPointerDown = (event: PointerEvent) => {
      // G1135 ①: a press on a card, a link, a control or a text field belongs to that thing.
      if (event.button !== 0) return;
      if (isMarqueeVetoTarget(event.target as Element | null)) return;
      // The press surface starts at the items' top edge and runs to the bottom of the scroller —
      // that is the browse area. The page header and the toolbar above it are not marquee surface.
      const items = containerRef.current?.getBoundingClientRect();
      if (items && event.clientY < items.top) return;
      pointer.current = { x: event.clientX, y: event.clientY };
      // G1135 ⑤: the pre-gesture selection is recorded here, before the gesture clears it.
      preGesture.current = handlers.current.selectedIds ?? [];
      hits.current = [];
      start.current = { x: event.clientX, y: event.clientY, started: false };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!start.current) return;
      pointer.current = { x: event.clientX, y: event.clientY };
      if (update() && frame.current == null) frame.current = requestAnimationFrame(autoScroll);
    };

    const onPointerUp = () => {
      // G1555 ③: the band goes away on release; the selection it produced stays. The Escape entry
      // leaves with the gesture — a released drag has no key of its own any more.
      start.current = null;
      setBand(null);
      focusStack.remove(MARQUEE_ESCAPE_ID);
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };

    /**
     * G1135 ⑤: Escape abandons the gesture. What the drag already picked stays — but a gesture
     * that never picked anything puts back the selection the press found, which is why the
     * pointerdown snapshot exists at all.
     */
    const cancel = () => {
      const picked = hits.current.length > 0;
      onPointerUp();
      if (!picked) handlers.current.onCancel?.(preGesture.current);
    };

    // G1135 ⑦: mid-drag, a card's own drag/text-selection gesture must not take over.
    const onGestureStart = (event: Event) => {
      if (start.current) event.preventDefault();
    };

    gestureTarget.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    gestureTarget.addEventListener('dragstart', onGestureStart);
    gestureTarget.addEventListener('selectstart', onGestureStart);
    return () => {
      gestureTarget.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      gestureTarget.removeEventListener('dragstart', onGestureStart);
      gestureTarget.removeEventListener('selectstart', onGestureStart);
      focusStack.remove(MARQUEE_ESCAPE_ID);
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [containerRef, collect]);

  if (!band) return null;
  return (
    <div
      aria-hidden
      data-testid="marquee-band"
      style={{
        position: 'fixed',
        left: band.left,
        top: band.top,
        width: band.width,
        height: band.height,
        zIndex: 10,
        pointerEvents: 'none',
        backgroundColor: 'rgba(46,109,233,0.12)',
        border: 'solid 0.8px rgb(46,109,233)',
        borderRadius: 4,
      }}
    />
  );
}
