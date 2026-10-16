'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from 'cn';

import { CARD_GAP, CARD_GAP_NARROW, CARD_MAX_WIDTH, columnsForWidth } from '@/lib/browse/grid';
import { useIsMobile } from '@/lib/use-is-mobile';

/**
 * The browse grid (G1096). Columns come from the container's own width, measured with a
 * ResizeObserver, rather than from viewport breakpoints — so collapsing the sidebar re-flows the
 * grid, which a `sm:`/`lg:` layout cannot do.
 *
 * The first render has no measurement yet and uses the narrow count, which is the same reading a
 * 2-column layout gives; the observer corrects it on the next frame.
 */
export function BrowseGrid({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(2);
  // G1096：官方 gap 逐字 `({$isMobile:t}) => t ? 8 : 20` —— 窄档（≤747px）用 8，桌面用 20。
  const isMobile = useIsMobile();
  const gap = isMobile ? CARD_GAP_NARROW : CARD_GAP;

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? node.clientWidth;
      setColumns(columnsForWidth(width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-browse-grid
      data-columns={columns}
      style={{
        // The official card has a width ceiling, so a very wide container stretches the gap
        // rather than the card. `minmax(0, 268px)` is that ceiling; the leftover space is
        // distributed by `justify-content`.
        gridTemplateColumns: `repeat(${columns}, minmax(0, ${CARD_MAX_WIDTH}px))`,
        gap: `${gap}px`,
        justifyContent: 'start',
      }}
      className={cn('grid', className)}
      {...props}
    >
      {children}
    </div>
  );
}
