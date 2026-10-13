'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from 'cn';

import { CARD_GAP, columnsForWidth } from '@/lib/browse/grid';

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
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: `${CARD_GAP}px` }}
      className={cn('grid', className)}
      {...props}
    >
      {children}
    </div>
  );
}
