/**
 * G466 —— 单元格输入层的 Enter/Escape 要**截住事件**（`keyboard.md` §一之十四 1）。
 *
 * 官方那支：Enter 提交时 `preventDefault()` + `stopPropagation()`，且**显式排除 `shiftKey`**
 * （`Shift-Enter` 仍是换行/别的语义，不提交）。理由：单元格可能被渲染进编辑器或表单里，
 * 事件一旦冒泡到块级 Enter 处理，就会出现"提交单元格"与"新建块"同时发生。
 *
 * 本地 `PropertyCell.tsx` 三处 `onKeyDown`（文本/数字/日期）此前都不截事件 ⇒ 同样的穿透。
 * 本模块把"该不该截"写成纯核，三个单元格共用一支，免得三处各写一遍（写三遍＝会分叉）。
 */

export type CellKeyAction = 'commit' | 'cancel' | 'none';

/**
 * 这个按键在单元格输入层该做什么：
 *   - 无修饰的 `Enter` ⇒ `commit`（提交并截住事件）；
 *   - `Shift-Enter`／带 Ctrl/Alt/Meta 的 Enter ⇒ `none`（交给默认行为，不截）；
 *   - `Escape` ⇒ `cancel`（回退并截住）；
 *   - 其余 ⇒ `none`。
 * IME 组合中（`keyCode 229`）一律 `none`——候选窗口自己在消化这两个键。
 */
export function cellKeyAction(event: {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
}): CellKeyAction {
  if (event.isComposing === true || event.keyCode === 229 || event.key === 'Process') return 'none';
  if (event.key === 'Escape') return 'cancel';
  if (event.key !== 'Enter') return 'none';
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return 'none';
  return 'commit';
}
