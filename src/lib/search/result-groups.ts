/**
 * G353 —— 结果分组是客户端按谓词**多归属**分桶 + 预计算跨组累计 offset（`interactions.md` §9.2）。
 *
 * 官方那支 `bit()` 的要点：**匹配到就 push、不 break** ⇒ 同一条结果**可同时出现在两个组里**
 * （例如一篇文档既命中"文档"组、其正文块又命中"块内容"组）。键盘 ↑/↓ 走的是**拍平后的序号**，
 * 所以要预先算出每组起始处的累计 offset（`offset[g] = 前 g 组条数之和`）。
 * 谓词签名含 `query` ⇒ 分组本身可以依赖查询串（不只是结果对象）。
 *
 * 本地此前是**互斥划分**（第一个匹配即归组，`if / else if`）⇒ 一条结果只会出现在一组里，
 * 且没有跨组序号。本模块把"多归属 + 累计 offset"写成纯核，供结果面板与键盘导航共用。
 */

/** 一组结果：组名 + 该组的成员下标（指向原始拍平数组）。 */
export interface ResultGroup {
  key: string;
  label: string;
  /** 该组成员在原始结果数组里的下标（可跨组重复）。 */
  members: number[];
}

/** 一个可分组的结果项：`facets` 是它命中的各面（谓词已判定）。 */
export interface GroupableItem {
  /** 这条结果命中的组键集合——**多归属**，不是单选。 */
  facets: string[];
}

export interface GroupSpec {
  key: string;
  label: string;
}

/**
 * 按"多归属"分桶：每组的成员＝所有 `facets` 含该组键的项（顺序保持原序）。
 * ★ 与互斥划分的差别就在这里——一条结果可以同时进两组。
 */
export function groupResults(items: readonly GroupableItem[], specs: readonly GroupSpec[]): ResultGroup[] {
  return specs.map((spec) => ({
    key: spec.key,
    label: spec.label,
    members: items.reduce<number[]>((acc, item, index) => {
      if (item.facets.includes(spec.key)) acc.push(index);
      return acc;
    }, []),
  }));
}

/**
 * 跨组累计 offset：`offsets[g]` ＝ 前 g 组的成员总数（即第 g 组在**拍平序**里的起点）。
 * 键盘 ↑/↓ 拿到拍平序号后，用这个数组二分定位"落在第几组"。
 */
export function cumulativeOffsets(groups: readonly ResultGroup[]): number[] {
  const offsets: number[] = [];
  let running = 0;
  for (const group of groups) {
    offsets.push(running);
    running += group.members.length;
  }
  return offsets;
}

/** 拍平后的条目：保留原始下标（同一条可能出现在多组 ⇒ 拍平序里出现多次）。 */
export interface FlattenedEntry {
  groupKey: string;
  /** 该条目在**原始结果数组**里的下标（多归属时两组指向同一下标）。 */
  itemIndex: number;
}

export function flattenGroups(groups: readonly ResultGroup[]): FlattenedEntry[] {
  const out: FlattenedEntry[] = [];
  for (const group of groups) {
    for (const itemIndex of group.members) out.push({ groupKey: group.key, itemIndex });
  }
  return out;
}

/**
 * 拍平序号 → 落在哪一组（用累计 offset 定位）。越界返回 `null`。
 */
export function groupAtFlatIndex(groups: readonly ResultGroup[], flatIndex: number): ResultGroup | null {
  const offsets = cumulativeOffsets(groups);
  for (let g = groups.length - 1; g >= 0; g -= 1) {
    if (flatIndex >= offsets[g]) return groups[g];
  }
  return null;
}
