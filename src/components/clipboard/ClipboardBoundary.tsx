'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import {
  CLIPBOARD_EVENTS,
  createClipboardStop,
  type ClipboardIntent,
  type ClipboardLikeEvent,
} from '@/lib/clipboard/boundary';

interface ClipboardBoundaryProps {
  /** 不给就只是"到此为止"：内层表面用浏览器自己的剪贴板，外层编辑器完全看不见。 */
  onIntent?: (intent: ClipboardIntent, event: ClipboardLikeEvent) => void;
  /** 传 `contents` 可以零布局代价地把边界套在单个输入控件外面。 */
  className?: string;
  children: ReactNode;
}

/**
 * 剪贴板作用域的 DOM 边界（官方形状：三事件同引用 + `data-paste-boundary`）。
 *
 * 为什么挂原生监听而不是 React 的 `onPaste`：React 把监听挂在根容器上，
 * 原生事件在到达根容器之前已经先冒泡过 `.ProseMirror`（编辑器的 `handlePaste`
 * 就在那儿）⇒ 在 React handler 里 `stopPropagation` 已经晚了，粘进去的图还是会被
 * 编辑器吃掉。挂在边界元素自己上，才真的拦得住外层。
 */
export function ClipboardBoundary({ onIntent, className, children }: ClipboardBoundaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const handlerRef = useRef(onIntent);

  useEffect(() => {
    handlerRef.current = onIntent;
  }, [onIntent]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // 一个引用接三种事件＝官方的"边界不区分事件类型"。
    const stop = createClipboardStop((intent, event) => handlerRef.current?.(intent, event));
    for (const type of CLIPBOARD_EVENTS) node.addEventListener(type, stop);
    return () => {
      for (const type of CLIPBOARD_EVENTS) node.removeEventListener(type, stop);
    };
  }, []);

  return (
    <div ref={ref} data-paste-boundary="true" className={className}>
      {children}
    </div>
  );
}
