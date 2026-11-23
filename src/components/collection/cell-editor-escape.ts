'use client';

import { useEffect, useRef } from 'react';

import { escapeKeyDef, focusStack } from '@/lib/focus/focus-stack';

/**
 * G456：集合单元格的弹层编辑器**按名字注册进全局焦点栈**——官方那一行是
 * `collection-v2-{date,select,multiselect,person}-editor` + `onClose` + `{isDisabled: !open}`，
 * 于是 Esc／关闭由全局栈**按名字路由**，而不是各弹层自己挂监听。
 *
 * 本地实现同一语义：开的时候 push（同名先去重），关掉或卸载时 remove；`close` 走 ref，
 * 免得每次渲染都换 identity 把注册刷一遍。
 */
export function useCellEditorEscape(open: boolean, id: string, close: () => void): void {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  useEffect(() => {
    if (!open) return;
    focusStack.push({ id, keyDefs: [escapeKeyDef(() => closeRef.current())] });
    return () => focusStack.remove(id);
  }, [open, id]);
}
