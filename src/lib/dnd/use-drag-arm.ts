'use client';

import { useEffect, useMemo, useRef } from 'react';

import { createDragArm } from './drag-arm';
import { dragBackendFor } from './backend';
import { touchArmDelay, type DragActivationConfig } from './drag-threshold';
import { beginTouchDrag, touchDragCancelled, type TouchDragSession } from './touch-drag';

/** 一个 React 组件用的最小事件形状（PointerEvent / 合成事件都满足）。 */
interface PointerLike {
  clientX: number;
  clientY: number;
  pointerType: string;
  /** 触摸长按要在这枚元素上派发 `dragstart`；合成事件里缺席时只是不起触摸通路。 */
  currentTarget?: Element;
}

/**
 * G268：把官方 `activationConstraints` 的那一档挂到一个真的会起拖的元素上。
 * 用法＝把三个 pointer 处理器放到 `draggable` 元素，`dragstart` 里问一句 `isArmed()`。
 *
 * G56：触摸端原生不会发起 HTML5 拖拽 ⇒ 长按越过 `touchDelay` 后，由 `touch-drag` 合成同一族
 * 拖拽事件，落点逻辑与桌面完全共用。指针移动越过 8px 视为滚动、撤销这次长按。
 */
export function useDragArm(config: DragActivationConfig) {
  const arm = useMemo(() => createDragArm(config), [config]);
  const touch = useRef<{
    timer: number | null;
    origin: { x: number; y: number } | null;
    session: TouchDragSession | null;
  }>({ timer: null, origin: null, session: null });

  const clearTimer = () => {
    if (touch.current.timer !== null) {
      window.clearTimeout(touch.current.timer);
      touch.current.timer = null;
    }
  };

  const reset = () => {
    clearTimer();
    touch.current.origin = null;
    // 触摸会话自己会在 pointerup 收尾；这里再 end 一次是幂等的（只补拖动中途被打断的情形）。
    touch.current.session?.end();
    touch.current.session = null;
    arm.release();
  };

  useEffect(
    () => () => {
      clearTimer();
      touch.current.session?.end();
      touch.current.session = null;
    },
    [],
  );

  return {
    isArmed: () => arm.armed,
    reset,
    /** 用一对坐标补一次判定——`dragstart` 现场比 pointermove 更早可达时用它兜住。 */
    track: (x: number, y: number) => arm.move({ x, y }),
    onPointerDown: (e: PointerLike) => {
      arm.press({ x: e.clientX, y: e.clientY, pointerType: e.pointerType });
      const hold = touchArmDelay(config, e.pointerType);
      const el = e.currentTarget;
      if (dragBackendFor(e.pointerType) !== 'touch' || hold <= 0 || !el) return;
      clearTimer();
      const origin = { x: e.clientX, y: e.clientY };
      touch.current.origin = origin;
      touch.current.timer = window.setTimeout(() => {
        touch.current.timer = null;
        if (!touch.current.origin) return;
        touch.current.session = beginTouchDrag(el, origin);
      }, hold);
    },
    onPointerMove: (e: PointerLike) => {
      arm.move({ x: e.clientX, y: e.clientY });
      const pending = touch.current;
      if (
        pending.timer !== null &&
        pending.origin &&
        touchDragCancelled(pending.origin, { x: e.clientX, y: e.clientY })
      ) {
        clearTimer();
        pending.origin = null;
      }
    },
    onPointerUp: reset,
  };
}