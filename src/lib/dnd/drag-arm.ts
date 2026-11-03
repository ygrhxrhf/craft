/**
 * G268 —— 把三档阈值变成一台能用的"起拖闸门"。
 *
 * `drag-threshold.ts` 记的是官方 `activationConstraints` 的**数值表**（`general` 位移 8px /
 * 触摸长按 150ms 容差 5ms、`handle` 两列全 0、`board` 不分设备一律长按 150ms）；这一层回答的是
 * "这一次按下到底走哪一列、什么时候算武装"。
 */

import { DRAG_THRESHOLDS, isTouchPointer } from './drag-threshold';
import type { DragActivationConfig } from './drag-threshold';

export type ArmGate =
  | { kind: 'immediate' }
  | { kind: 'distance'; px: number }
  | { kind: 'hold'; ms: number; tolerance: number };

/**
 * 该这一次按下用哪一道门。触摸/笔只看长按（官方把位移门留给指针设备）；鼠标这一侧，
 * `board` 档指针列位移门是 0 但长按仍在——这正是文档里"一律长按、不分设备"的写法，
 * 所以"位移门为 0 且还有长按"要判成 hold，而不是"按下即拖"。只有两列都是 0 才是 `handle` 档的按下即拖。
 */
export function armGate(
  config: DragActivationConfig,
  pointerType?: string | null,
): ArmGate {
  const { pointerDistance, touchDelay, touchTolerance } = DRAG_THRESHOLDS[config];
  if (isTouchPointer(pointerType)) {
    return touchDelay === 0
      ? { kind: 'immediate' }
      : { kind: 'hold', ms: touchDelay, tolerance: touchTolerance };
  }
  if (pointerDistance === 0 && touchDelay === 0) return { kind: 'immediate' };
  if (pointerDistance === 0) {
    return { kind: 'hold', ms: touchDelay, tolerance: touchTolerance };
  }
  return { kind: 'distance', px: pointerDistance };
}

/**
 * 单次判定。★ 容差的方向官方没给（只写了 `Delay({value:150, tolerance:5})`），本地按
 * "容差原谅差一点点"取：按住 `ms - tolerance` 以上即算够，早于这一线不起拖。
 */
export function armDecision(
  gate: ArmGate,
  moved: { px?: number; ms?: number }
): boolean {
  if (gate.kind === 'immediate') return true;
  if (gate.kind === 'distance') return (moved.px ?? 0) >= gate.px;
  return (moved.ms ?? 0) + gate.tolerance >= gate.ms;
}

export interface DragArm {
  /** `dragstart` 唯一的判据：没武装就 `preventDefault()`。 */
  readonly armed: boolean;
  press(init: {
    x: number;
    y: number;
    pointerType?: string | null;
    time?: number;
  }): void;
  move(init: { x: number; y: number; time?: number }): void;
  release(): void;
}

/** 一枚可复用的闸门实例：按下取档与原点，移动按档重算，松手复位。 */
export function createDragArm(config: DragActivationConfig): DragArm {
  let gate: ArmGate = { kind: 'distance', px: Number.POSITIVE_INFINITY };
  let origin: { x: number; y: number; time: number } | null = null;
  let armed = false;
  const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now());

  return {
    get armed() {
      return armed;
    },
    press({ x, y, pointerType, time }) {
      gate = armGate(config, pointerType);
      origin = { x, y, time: time ?? now() };
      armed = armDecision(gate, { px: 0, ms: 0 });
    },
    move({ x, y, time }) {
      if (!origin) return;
      if (armed) return;
      const gatePassed =
        gate.kind === 'distance'
          ? armDecision(gate, { px: Math.hypot(x - origin.x, y - origin.y) })
          : armDecision(gate, { ms: (time ?? now()) - origin.time });
      // 一次越过门槛就锁定到松手为止，往回挪一点不该把已经起势的拖拽关掉。
      if (gatePassed) armed = true;
    },
    release() {
      gate = { kind: 'distance', px: Number.POSITIVE_INFINITY };
      origin = null;
      armed = false;
    },
  };
}
