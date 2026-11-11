'use client';

import { useSyncExternalStore } from 'react';

import { isSafariBrowser } from '@/lib/browse/browser-compat';

const subscribe = () => () => {};

/**
 * G746：UA 判定放钩子里，服务端快照给 `false`，避免 hydration 时两端不一致
 * （G1486 的同款结构：首帧必须与服务端逐字相同）。
 */
export function useIsSafari(): boolean {
  return useSyncExternalStore(subscribe, () => isSafariBrowser(navigator.userAgent), () => false);
}
