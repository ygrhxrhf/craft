/**
 * G607 —— 侧栏同层拖拽按**整批有序 id** 落库，而不是给被拖行算一个中点小数。
 * 官方写的是整组 `orderedIds`；本地逐行 applyLocal，但每行拿到的序号来自同一份最终顺序，
 * 且一次拖拽会把该层所有兄弟一起写成 0…n-1。
 */

export interface OrderedSibling {
  id: string;
  order: number;
}

/** 把 `sourceId` 插到 `targetId` 前/后，返回该层最终的 id 顺序。 */
export function orderAfterDrop(
  siblings: readonly OrderedSibling[],
  sourceId: string,
  targetId: string,
  position: 'before' | 'after',
): string[] {
  const ids = [...siblings]
    .filter((sibling) => sibling.id !== sourceId)
    .sort((a, b) => a.order - b.order)
    .map((sibling) => sibling.id);
  const targetIndex = ids.indexOf(targetId);
  if (targetIndex < 0) return [];
  const insertAt = position === 'before' ? targetIndex : targetIndex + 1;
  ids.splice(insertAt, 0, sourceId);
  return ids;
}

/** 最终顺序 → 每行的 `order` 补丁（0…n-1）。 */
export function orderPatches(ids: readonly string[]): { id: string; order: number }[] {
  return ids.map((id, index) => ({ id, order: index }));
}
