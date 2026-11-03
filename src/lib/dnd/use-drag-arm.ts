'use client';

import { useMemo } from 'react';

import { createDragArm } from './drag-arm';
import type { DragActivationConfig } from './drag-threshold';

/** 一个 React 组件用的最小事件形状（PointerEvent / 合成事件都满足）。 */
interface PointerLike {
  clientX: number;
  clientY: number;
  pointerType: string;
}

/**
 * G268：把官方 `activationConstraints` 的那一档挂到一个真的会起拖的元素上。
 * 用法＝把三个 pointer 处理器放到 `draggable` 元素，`dragstart` 里问一句 `isArmed()`。
 */
export function useDragArm(config: DragActivationConfig) {
  const arm = useMemo(() => createDragArm(config), [config]);
  const reset = () => arm.release();
  return {
    isArmed: () => arm.armed,
    reset,
    /** 用一对坐标补一次判定——`dragstart` 现场比 pointermove 更早可达时用它兜住。 */
    track: (x: number, y: number) => arm.move({ x, y }),
    onPointerDown: (e: PointerLike) =>
      arm.press({ x: e.clientX, y: e.clientY, pointerType: e.pointerType }),
    onPointerMove: (e: PointerLike) => arm.move({ x: e.clientX, y: e.clientY }),
    onPointerUp: reset,
  };
}
