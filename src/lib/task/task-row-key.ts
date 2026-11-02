/**
 * G1603 —— 任务行聚焦后的四条键（官方表 D）：
 * `Ctrl-/` 完成、`Ctrl-Alt-Shift-T` 取消、`Ctrl-Shift-S` 改排期、`Ctrl-Shift-D` 改截止、
 * `Ctrl-Alt-S` 把排期设为今天。
 */
export type TaskRowKeyAction = 'toggle' | 'cancel' | 'date' | 'deadline' | 'schedule-today';

export function taskRowKeyAction(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}): TaskRowKeyAction | null {
  const mod = event.ctrlKey === true || event.metaKey === true;
  if (!mod) return event.key === ' ' || event.key === 'Spacebar' ? 'toggle' : null;

  const key = event.key.toLowerCase();
  if (key === 'enter') return null; // table shortcuts own Ctrl-Enter
  if (key === '/' && !event.altKey && !event.shiftKey) return 'toggle';
  if (key === 't' && event.altKey && event.shiftKey) return 'cancel';
  if (key === 't' && event.altKey && !event.shiftKey) return 'toggle';
  if (key === 's' && event.shiftKey && !event.altKey) return 'date';
  if (key === 'd' && event.shiftKey && !event.altKey) return 'deadline';
  if (key === 's' && event.altKey && !event.shiftKey) return 'schedule-today';
  return null;
}
