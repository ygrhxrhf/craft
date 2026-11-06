/**
 * G1599 —— `Ctrl-Shift-↑/↓`（面板 Windows 串「选择到顶部/底部」）与并列的 COMMON 档
 * `Ctrl-Shift-Home/End`：官方实测**不扩选**，且 `↓`／Home／End 之后焦点离开编辑器
 * （第 381 批三块 `AAA/BBB/CCC`：`↑` 后 collapsed 仍 true、选区文本为空；`↓` 之后
 * selection 变 undefined；COMMON 档同样丢焦点）。本地原先走 ProseMirror 默认
 * `Mod-Shift-ArrowUp/Down` 的 `selectTextUp/Down`，会把选区扩一块。
 *
 * 本模块把「按下去之后做什么」独立成纯函数：
 *   - `block`：拦下弦、不扩选、焦点留在编辑器（官方 `↑` 这一步的读数）；
 *   - `blur`：拦下弦、不扩选、焦点交给 body（官方 `↓`／Home／End 的读数）。
 *
 * ☆ 边界：官方只拿到 `↑` 的有效读数、`↓` 起焦点已丢，所以这里只承诺"不扩选"是实测，
 *    "丢焦点"是按同一批读数复刻的等价行为。Mac 侧没有同一组读数，暂不改动。
 */

export type SelectEdgeAction = 'block' | 'blur';

interface ChordLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing?: boolean;
}

/**
 * 这个弦要不要被本地接管。返回 null＝不接管（交回 ProseMirror 默认）。
 * Windows/Linux 的弦是 Ctrl；Mac 上同形是 ⌘——但 Mac 没有实测，故不接管。
 */
export function selectToEdgeAction(chord: ChordLike, platform: 'mac' | 'win'): SelectEdgeAction | null {
  if (platform === 'mac') return null;
  if (chord.isComposing) return null;
  if (!(chord.ctrlKey || chord.metaKey) || !chord.shiftKey || chord.altKey) return null;
  switch (chord.key) {
    case 'ArrowUp':
      return 'block';
    case 'ArrowDown':
    case 'Home':
    case 'End':
      return 'blur';
    default:
      return null;
  }
}