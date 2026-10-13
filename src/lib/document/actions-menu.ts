/**
 * The info panel's 「动作」 sub-tab (G225). Twelve entries, five of which print a key chord beside
 * the label. The list is the collected one; this module records it so the panel can be brought up
 * to it entry by entry rather than by eye.
 */

export interface ActionEntry {
  id: string;
  label: string;
  /** Whether the official row prints a key chord beside the label. */
  showsChord: boolean;
  /** Whether the local build already has this entry. */
  implemented: boolean;
}

export const ACTION_ENTRIES: readonly ActionEntry[] = [
  { id: 'findInPage', label: '在页面中查找', showsChord: true, implemented: false },
  { id: 'quickOpen', label: '快速开启', showsChord: true, implemented: false },
  { id: 'addComment', label: '添加评论', showsChord: true, implemented: false },
  { id: 'moveUp', label: '上移', showsChord: true, implemented: false },
  { id: 'moveDown', label: '下移', showsChord: true, implemented: false },
  { id: 'moveTop', label: '移至顶部', showsChord: false, implemented: false },
  { id: 'moveBottom', label: '移至底部', showsChord: false, implemented: false },
  { id: 'group', label: '组合', showsChord: false, implemented: false },
  { id: 'ungroup', label: '取消组合', showsChord: false, implemented: false },
  { id: 'rename', label: '重命名', showsChord: false, implemented: false },
  { id: 'duplicate', label: '创建副本', showsChord: false, implemented: true },
  { id: 'delete', label: '删除', showsChord: false, implemented: true },
] as const;

/** The entries the local build does not have yet. */
export function missingActions(): ActionEntry[] {
  return ACTION_ENTRIES.filter((entry) => !entry.implemented);
}

/** How many entries print a key chord, which the ledger records as five. */
export function chordedActions(): ActionEntry[] {
  return ACTION_ENTRIES.filter((entry) => entry.showsChord);
}

export function actionEntry(id: string): ActionEntry | null {
  return ACTION_ENTRIES.find((entry) => entry.id === id) ?? null;
}
