/**
 * G1600 —— 任务视图的分组标题是一整行按钮，表 D 三条折叠键落在它身上；判据只写键条件、不看修饰键，
 * 所以 `Ctrl+Space` / `Shift+←` 同样命中，同向键幂等。
 */
export type SectionKeyAction = 'collapse' | 'expand' | 'toggle';

export function sectionKeyAction(event: { key: string }): SectionKeyAction | null {
  if (event.key === 'ArrowLeft') return 'collapse';
  if (event.key === 'ArrowRight') return 'expand';
  if (event.key === ' ' || event.key === 'Spacebar') return 'toggle';
  return null;
}

export function applySectionAction(collapsed: boolean, action: SectionKeyAction): boolean {
  if (action === 'collapse') return true;
  if (action === 'expand') return false;
  return !collapsed;
}
