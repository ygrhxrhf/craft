'use client';

import { useSyncExternalStore } from 'react';

import { detectPlatform, type Platform } from './keymap';

/**
 * 服务端那一侧的答案。`detectPlatform()` 在没有 `navigator` 时只会答 `win`，
 * 所以 SSR 打出去的键位提示永远是桌面 Windows 那一串——把它写死成常量，是为了让
 * 客户端的**首帧**也必须是这个值：首帧一旦按真机 UA 猜成 `mac`，React 就在
 * hydration 时撞见两棵树不一致（`gap.md` G1486：手机视口下整页报错，开发态角标
 * 还会烧进视觉基线）。
 */
export const SERVER_PLATFORM: Platform = 'win';

/**
 * 平台不随时间变化，所以没有可订阅的东西；`useSyncExternalStore` 只是让客户端快照
 * 与首帧服务端快照分离的现成机制（此前用 effect + setState，会被
 * react-hooks/set-state-in-effect 拦下）。服务端快照固定 `win`，hydrate 之后再拿真机值。
 */
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): Platform {
  return detectPlatform();
}

function getServerSnapshot(): Platform {
  return SERVER_PLATFORM;
}

/** 键位提示该印哪一端的文案。挂载后才是真机那一端；挂载前必须与服务端逐字相同。 */
export function usePlatform(): Platform {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
