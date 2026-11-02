/**
 * G1455 —— 「动作」子页签是 **12 项**，且按"当前有没有选中块"分档禁用（`panels.md`，第 407 批实测）。
 *
 * 官方那一屏的读数：12 项里只有「在页面中查找」「快速开启」两枚可用，其余 **10 枚全部 disabled**——
 * 因为当轮编辑器里没有块选区。逐项：
 *
 *   1. 在页面中查找      （恒可用——它作用于整页，不需要选区）
 *   2. 快速开启          （恒可用——它打开命令面板）
 *   3. 添加评论          （需要选区）
 *   4. 向上移动  5. 向下移动  6. 移至顶部  7. 移至底部   （需要选区）
 *   8. 组合      9. 取消组合                             （需要选区）
 *  10. 重命名      11. 创建副本      12. 删除             （需要选区）
 *
 * ☆ 判读限度照台账原样：这证的是**当轮该面板的可点性**，不证命令永久不可用——有选区时那 10 枚就亮。
 */

export type ActionItemId =
  | 'findInPage'
  | 'quickOpen'
  | 'addComment'
  | 'moveUp'
  | 'moveDown'
  | 'moveTop'
  | 'moveBottom'
  | 'group'
  | 'ungroup'
  | 'rename'
  | 'duplicate'
  | 'delete';

/** 官方那 12 项的顺序与文案（逐字）。 */
export const ACTION_ITEMS: readonly { id: ActionItemId; label: string; shortcut?: string }[] = [
  { id: 'findInPage', label: '在页面中查找', shortcut: 'Ctrl-F' },
  { id: 'quickOpen', label: '快速开启', shortcut: 'Ctrl-O' },
  { id: 'addComment', label: '添加评论', shortcut: 'Ctrl-Shift-M' },
  { id: 'moveUp', label: '向上移动', shortcut: 'Alt-↑' },
  { id: 'moveDown', label: '向下移动', shortcut: 'Alt-↓' },
  { id: 'moveTop', label: '移至顶部' },
  { id: 'moveBottom', label: '移至底部' },
  { id: 'group', label: '组合' },
  { id: 'ungroup', label: '取消组合' },
  { id: 'rename', label: '重命名' },
  { id: 'duplicate', label: '创建副本' },
  { id: 'delete', label: '删除' },
] as const;

/** 不需要选区的两枚——它们作用于整页／整个应用。 */
const SELECTION_FREE: ReadonlySet<ActionItemId> = new Set(['findInPage', 'quickOpen']);

/**
 * 这一项现在能不能点：两枚"免选区"恒真，其余都要有选中块。
 */
export function actionEnabled(id: ActionItemId, hasSelection: boolean): boolean {
  if (SELECTION_FREE.has(id)) return true;
  return hasSelection;
}

/** 有/无选区时分别可点的项数（12 项：无选区 2、有选区 12）。 */
export function enabledActionCount(hasSelection: boolean): number {
  return ACTION_ITEMS.filter((item) => actionEnabled(item.id, hasSelection)).length;
}
