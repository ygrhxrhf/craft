/**
 * G56 —— 官方是 `HTML5DnDProvider` 与 `TouchDnDProvider` 两套后端：桌面走 HTML5，触摸走
 * Touch。本仓的树行与排序列表一直只有 `draggable` ＋ `dragstart/dragover/drop` 这一套，
 * 触摸屏上浏览器根本不会发起原生 HTML5 拖拽 ⇒ 长按之后什么都不发生。
 *
 * 这一支就是那条 Touch 通路：长按越过阈值后，**由指针事件合成同一族拖拽事件**（`dragstart`
 * → `dragover` → `drop` → `dragend`），把现有的落点逻辑原样复用。合成事件里的
 * `DataTransfer` 是可写的（浏览器只对真实拖拽把它设成只读），所以 `setData`／MIME 判断照旧。
 */

export interface TouchDragPoint {
  x: number;
  y: number;
}

export interface TouchDragSession {
  /** 当前指针下接受拖拽的元素（最近一次 dragover 的命中）。 */
  target: Element | null;
  end: () => void;
}

const GHOST_ID = 'craft-touch-drag-ghost';

function ghostFor(source: Element): HTMLElement {
  const existing = document.getElementById(GHOST_ID);
  if (existing) return existing;
  const ghost = document.createElement('div');
  ghost.id = GHOST_ID;
  ghost.textContent = (source.textContent ?? '').trim().slice(0, 40) || '拖拽中';
  ghost.style.cssText = [
    'position:fixed',
    'z-index:2147483647',
    'pointer-events:none',
    'padding:2px 8px',
    'border-radius:6px',
    'font-size:12px',
    'line-height:18px',
    'background:var(--card-background,#fff)',
    'color:inherit',
    'box-shadow:0 2px 8px rgba(0,0,0,.18)',
    'opacity:.85',
    'transform:translate(-50%,-140%)',
    'white-space:nowrap',
    'max-width:240px',
    'overflow:hidden',
    'text-overflow:ellipsis',
  ].join(';');
  document.body.appendChild(ghost);
  return ghost;
}

function moveGhost(point: TouchDragPoint) {
  const ghost = document.getElementById(GHOST_ID);
  if (!ghost) return;
  ghost.style.left = `${point.x}px`;
  ghost.style.top = `${point.y}px`;
}

function dragEvent(type: string, dataTransfer: DataTransfer, point: TouchDragPoint): DragEvent {
  return new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: point.x,
    clientY: point.y,
    dataTransfer,
  });
}

function elementAt(point: TouchDragPoint): Element | null {
  return document.elementFromPoint(point.x, point.y);
}

/**
 * 开始一次触摸拖拽。返回的会话由调用方在抬起时 `end()`（内部也会在 `pointerup` 时自己收尾，
 * 两处都调是幂等的）。
 *
 * `source` 必须是那枚 `draggable` 元素——`dragstart` 派发在它身上，原有的
 * `onDragStart`（写 payload / MIME）会照常执行。
 */
export function beginTouchDrag(source: Element, point: TouchDragPoint): TouchDragSession {
  const dataTransfer = new DataTransfer();
  let target: Element | null = null;
  let ended = false;
  let pending: TouchDragPoint | null = null;

  const finish = (drop: boolean) => {
    if (ended) return;
    ended = true;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('contextmenu', swallowContextMenu);
    document.removeEventListener('touchmove', blockTouchScroll);
    // 抬起前若一次 pointermove 都没落地（隐藏页的 rAF 会被节流），这里补一次命中。
    if (drop && !target && pending) {
      target = elementAt(pending);
    }
    if (drop && target) target.dispatchEvent(dragEvent('drop', dataTransfer, pending ?? point));
    source.dispatchEvent(dragEvent('dragend', dataTransfer, pending ?? point));
    document.getElementById(GHOST_ID)?.remove();
  };

  const swallowContextMenu = (event: Event) => event.preventDefault();
  // 长按已经开始拖拽，就不该同时滚页面（touchmove 必须非 passive 才拦得住）。
  const blockTouchScroll = (event: TouchEvent) => {
    if (event.cancelable) event.preventDefault();
  };

  const flushMove = () => {
    if (!pending || ended) return;
    moveGhost(pending);
    const hit = elementAt(pending);
    if (hit && hit !== target) {
      target = hit;
      hit.dispatchEvent(dragEvent('dragenter', dataTransfer, pending));
    }
    if (hit) hit.dispatchEvent(dragEvent('dragover', dataTransfer, pending));
  };

  // 直接派发，不用 rAF：隐藏标签页里 rAF 会被节流到几乎不跑，触摸拖拽就永远没有落点。
  const onPointerMove = (event: PointerEvent) => {
    pending = { x: event.clientX, y: event.clientY };
    flushMove();
  };
  const onPointerUp = () => finish(true);

  // 先派发 dragstart，让源组件的 payload 就位，再开始追踪落点。源若摘掉事件也只是少一份
// 载荷（落点处理器会自行 no-op），仍然给出拖动反馈，所以这里不提前退出。
  source.dispatchEvent(dragEvent('dragstart', dataTransfer, point));

  ghostFor(source);
  moveGhost(point);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('contextmenu', swallowContextMenu);
  document.addEventListener('touchmove', blockTouchScroll, { passive: false });

  return {
    get target() {
      return target;
    },
    end: () => finish(true),
  };
}

/** 长按越界多少像素就按"用户在滚动"处理、不再起拖。 */
export const TOUCH_DRAG_CANCEL_DISTANCE = 8;

export function touchDragCancelled(origin: TouchDragPoint, current: TouchDragPoint): boolean {
  return Math.hypot(current.x - origin.x, current.y - origin.y) > TOUCH_DRAG_CANCEL_DISTANCE;
}