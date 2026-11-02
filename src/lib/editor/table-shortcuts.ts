/**
 * G1576/G1577 —— 单元格光标下的表格增行/增列键位（表 E 实测生效的三枚）：
 * Ctrl-Enter＝加行；Ctrl-Shift-Enter 与 Ctrl-Alt-Enter＝加列。
 */
export type TableShortcutAxis = 'row' | 'column';

export function tableAxisForShortcut(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}): TableShortcutAxis | null {
  if (event.key !== 'Enter') return null;
  if (!(event.ctrlKey || event.metaKey)) return null;
  return event.shiftKey || event.altKey ? 'column' : 'row';
}
