'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from 'cn';

import { CARD_GAP, CARD_GAP_NARROW, cardMaxWidthForColumns, columnsForWidth } from '@/lib/browse/grid';
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
  // G1126: the 2-column tier stretches up to 308.5px, while 3+ column layouts cap at 268px.
  const maxWidth = cardMaxWidthForColumns(columns);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    // 官方的网格铺在稿件纸（paper）的边上，页面滚动条落在纸外的 8px 里，所以它的 1120 可用宽
    //  里没有扣滚动条；本地的滚动容器在内容区内部，会把 15px 的经典滚动条算进 `contentRect`。
    // 这里把最近的那个可滚父级的滚动条宽度补回来，列的判据才和官方同一把尺子。
    const gutter = () => {
      let el: HTMLElement | null = node;
      while (el && el !== document.body) {
        if (el.offsetWidth > el.clientWidth && /auto|scroll/.test(getComputedStyle(el).overflowY)) {
          return el.offsetWidth - el.clientWidth;
        }
        el = el.parentElement;
      }
      return 0;
    };
    const observer = new ResizeObserver((entries) => {
      const width = (entries[0]?.contentRect.width ?? node.clientWidth) + gutter();
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
        // rather than the card. `minmax(0, maxWidth)` is that ceiling; the leftover space is
        // distributed by `justify-content`.
        gridTemplateColumns: `repeat(${columns}, minmax(0, ${maxWidth}px))`,
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
