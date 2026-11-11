/**
 * G727 —— 官方快捷键面板「在任务视图中」那半。行上已有的 `Space`／`Ctrl-/` 等六条在
 * `task-row-key.ts`；分组 `←`／`→` 在 `section-key.ts`；这里补的是剩下的五条：
 * `⏎` 编辑任务、`Ctrl-→` 导航至区块、`↑` 上一个任务／`↓` 下一个任务、`⌫`／`Delete` 删除。
 *
 * `←`／`→` 与 `Ctrl-→` 不冲突：无修饰的箭头归分组标题，带 Ctrl/⌘ 的箭头归任务行。
 */
export type TaskViewKeyAction = 'prev' | 'next' | 'delete' | 'edit' | 'navigate-block';

export function taskViewKeyAction(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}): TaskViewKeyAction | null {
  if (event.ctrlKey === true || event.metaKey === true) {
    return event.key === 'ArrowRight' && !event.altKey && !event.shiftKey ? 'navigate-block' : null;
  }
  if (event.altKey) return null;
  if (event.key === 'ArrowUp') return 'prev';
  if (event.key === 'ArrowDown') return 'next';
  if (event.key === 'Backspace' || event.key === 'Delete') return 'delete';
  if (event.key === 'Enter') return 'edit';
  return null;
}

/**
 * `Ctrl-Z`／`Ctrl-Shift-Z` 是**视图级**历史：命中的是页面而不是某一行，所以单列判据，
 * 免得行处理与页面处理各跑一遍同一次撤销。
 */
export type TaskHistoryAction = 'undo' | 'redo';

export function taskHistoryKeyAction(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}): TaskHistoryAction | null {
  if (event.ctrlKey !== true && event.metaKey !== true) return null;
  if (event.altKey) return null;
  if (event.key.toLowerCase() !== 'z') return null;
  return event.shiftKey ? 'redo' : 'undo';
}

/** 行导航只走邻居，到头即停（不首尾相绕）。 */
export function rowNavIndex(current: number, count: number, action: 'prev' | 'next'): number | null {
  if (current < 0 || current >= count) return null;
  const target = action === 'prev' ? current - 1 : current + 1;
  return target >= 0 && target < count ? target : null;
}

/**
 * 键盘快捷键不该从输入框里抢键：在「添加任务」框里按 `↑` 是光标移动，不是跳行。
 */
export function isEditableTarget(
  target: { tagName?: string; isContentEditable?: boolean } | null | undefined,
): boolean {
  if (!target) return false;
  const tag = (target.tagName ?? '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true;
}
