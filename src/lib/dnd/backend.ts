/**
 * G461 —— 拖拽后端按设备分两套，且**用哪一套是加载期决定**，不是运行期判断。
 *
 * 官方把 `HTML5DnDProvider` 与 `TouchDnDProvider` 拆成两个懒加载 chunk（各 665 B），桌面走
 * HTML5、触摸走 Touch。落到本地，本地拖拽是全手写原生 Pointer 事件（`sidebar-drag.ts`、
 * `DragHandle.tsx`），没有 dnd-kit 那套 provider；但"按设备选一条通路"这件事本身是可复用的，
 * 且它决定了**阈值表读哪一列**（触摸读 hold，桌面读 move，见 `drag-threshold.ts`）。
 *
 * 本模块把「设备 → 后端」这一步单独拎出来：它是一枚纯函数，好在没有 DOM 的地方也能钉住
 * "桌面 HTML5、触摸 Touch"这条判据。
 */

export type DragBackend = 'html5' | 'touch';

/**
 * 选哪一套后端。`pointerType` 是发起拖拽那一下的指针类型（`PointerEvent.pointerType`）；
 * `'touch'` 与 `'pen'` 归触摸端，其余（含 `''`、`'mouse'`、`undefined`）归桌面。
 *
 * ☆ 判据只看**发起拖拽的那一下**：中途换成别的输入设备不改后端——官方那两套是加载期分好的，
 *   不随一次拖拽内的输入变化切换。
 */
export function dragBackendFor(pointerType: string | undefined | null): DragBackend {
  return pointerType === 'touch' || pointerType === 'pen' ? 'touch' : 'html5';
}

/**
 * 该后端的懒加载 chunk 名（对应官方两个 665 B 的 provider）。本地没有真 chunk，但把"哪一套"
 * 变成具名产物，调用方（或未来的动态 import）就有单一出处，不会两处各写一遍字符串。
 */
export function dragBackendChunk(backend: DragBackend): string {
  return backend === 'touch' ? 'TouchDnDProvider' : 'HTML5DnDProvider';
}
