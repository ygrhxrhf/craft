/**
 * G285 —— 集合支持**双向关联字段**（`model.md`）。
 *
 * 官方那组键：`related.collection` + `related.field` + `two.way`「双向」 + `add.item.to.x` +
 * `choose.collection`。双向的意思是：A 集合的关联列指向 B，B 集合里会**自动出现一列反指 A**
 * （`related.field`），两边的条目互为对方那条记录的关联值。
 *
 * 本地关联只有单向目标（`AddPropertyMenu` 的 relation 只存 collectionId），`RelationCell` 只读
 * 本行值。本模块给出双向关联的形状与"反向列该怎么建"的推导。
 */

export const TWO_WAY_COPY = {
  relatedCollection: { key: 'related.collection', label: '关联集合' },
  relatedField: { key: 'related.field', label: '关联字段' },
  twoWay: { key: 'two.way', label: '双向' },
  addItemTo: { key: 'add.item.to.x', label: '添加条目到 [0]' },
  chooseCollection: { key: 'choose.collection', label: '选择集合' },
} as const;

export interface RelationColumnSpec {
  /** 本列的集合（拥有这条关联列的集合）。 */
  collectionId: string;
  /** 本列指向的集合。 */
  targetCollectionId: string;
  /** 是否双向。 */
  twoWay: boolean;
  /** 反向列的显示名（双向时用；单向时为 null）。 */
  backFieldName: string | null;
}

/**
 * 双向时**反向列**该长什么样：它属于目标集合、指向本列所在的集合、`twoWay` 同样为真。
 * 反向列的名字用用户给的 `backFieldName`；没给就用一句本地兜底名（不发明官方键）。
 */
export function backColumnOf(spec: RelationColumnSpec): RelationColumnSpec | null {
  if (!spec.twoWay) return null;
  return {
    collectionId: spec.targetCollectionId,
    targetCollectionId: spec.collectionId,
    twoWay: true,
    backFieldName: spec.backFieldName ?? '关联',
  };
}

/**
 * 关联值的**两向写入**：在 A 行的本列里加 `bItemId` 时，B 行的反向列里也要加 `aItemId`。
 * 单向 ⇒ 只改本侧。返回两侧各自该得到的值数组（调用方据此落库）。
 */
export function relationWrite(input: {
  twoWay: boolean;
  aItemId: string;
  bItemId: string;
  aCurrent: string[];
  bCurrent: string[];
}): { a: string[]; b: string[] } {
  const a = input.aCurrent.includes(input.bItemId) ? input.aCurrent : [...input.aCurrent, input.bItemId];
  if (!input.twoWay) return { a, b: input.bCurrent };
  const b = input.bCurrent.includes(input.aItemId) ? input.bCurrent : [...input.bCurrent, input.aItemId];
  return { a, b };
}

/** 删除一侧的关联时，另一侧也要摘掉（双向时）。 */
export function relationRemove(input: {
  twoWay: boolean;
  aItemId: string;
  bItemId: string;
  aCurrent: string[];
  bCurrent: string[];
}): { a: string[]; b: string[] } {
  const a = input.aCurrent.filter((id) => id !== input.bItemId);
  if (!input.twoWay) return { a, b: input.bCurrent };
  const b = input.bCurrent.filter((id) => id !== input.aItemId);
  return { a, b };
}
