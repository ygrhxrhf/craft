/**
 * G623 —— 浏览屏的批量选择模式。官方：⋯ 菜单第一项「选择」进入，卡片出复选框，
 * 工具栏换成「已选 N 项」＋ 星标/文件夹/垃圾桶；**进入模式即自动选中第一张卡**。
 */

export function enterSelection(orderedIds: readonly string[]): Set<string> {
  return new Set(orderedIds.length > 0 ? [orderedIds[0]] : []);
}

export function toggleSelection(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function selectionLabel(count: number): string {
  return `已选 ${count} 项`;
}

export function allSelected(orderedIds: readonly string[], selected: ReadonlySet<string>): boolean {
  return orderedIds.length > 0 && orderedIds.every((id) => selected.has(id));
}
