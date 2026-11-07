'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSidebarStore } from '@/lib/store/use-sidebar-store';

export function SidebarResizer() {
  const { width, setWidth } = useSidebarStore();
  const isResizing = useRef(false);

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = width;

    function onPointerMove(event: PointerEvent) {
      if (!isResizing.current) return;
      setWidth(startWidth + (event.clientX - startX));
    }

    function onPointerUp() {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, [width, setWidth]);

  return (
    // G03：手柄**绝对定位**在侧栏右缘，不占 flex 宽度——此前 `w-1 shrink-0` 把主列从
    // 288/1152 挤成 292/1148（craft main @x=288 宽 1152）。
    <div
      className="group absolute inset-y-0 -right-1.5 w-3 cursor-col-resize touch-none transition-colors"
      onPointerDown={startResize}
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-border/80 group-data-resizing:bg-craft-accent/50" />
    </div>
  );
}
