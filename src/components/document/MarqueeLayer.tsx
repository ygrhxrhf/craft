'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  isMarqueeDrag,
  marqueeHits,
  rectFromPoints,
  type ItemRect,
  type Rect,
} from '@/lib/browse/marquee';

/**
 * G1555: drag-marquee selection over the browse cards.
 *
 * The overlay is a fixed-position, `pointer-events: none` rectangle; the item rects are captured
 * once when the drag starts, so scrolling mid-drag cannot shift the hit test under the band.
 */
export function MarqueeLayer({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const [band, setBand] = useState<Rect | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const start = useRef<{ x: number; y: number; items: ItemRect[] } | null>(null);

  const collectItems = useCallback((): ItemRect[] => {
    const container = containerRef.current;
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLElement>('[data-item-id]')).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        id: element.dataset.itemId ?? '',
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

    const onPointerDown = (event: PointerEvent) => {
      // Only a press on empty space starts a marquee; a press on a card is a click/drag of the card.
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-item-id]')) return;
      start.current = { x: event.clientX, y: event.clientY, items: collectItems() };
    };

    const onPointerMove = (event: PointerEvent) => {
      const origin = start.current;
      if (!origin) return;
      if (!isMarqueeDrag(origin, { x: event.clientX, y: event.clientY })) return;
      const next = rectFromPoints(origin.x, origin.y, event.clientX, event.clientY);
      setBand(next);
      setSelected(marqueeHits(next, origin.items));
    };

    const onPointerUp = () => {
      start.current = null;
      setBand(null);
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [containerRef, collectItems]);

  // The selection is exposed on the container so the surrounding screen can act on it.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.dataset.marqueeSelected = selected.join(',');
  }, [containerRef, selected]);

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
