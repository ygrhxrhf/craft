/**
 * G278 —— **降级时子块平铺上提**：把块降级为正文（`setTextStyle(Heading)`）时，它原有的
 * 缩进子块**不删也不留在嵌套里**，而是整批提到它自己之后、与它同级（`afterAnchor(自身)`）。
 *
 * 为什么不能两者取一：删除会让用户丢内容；保留嵌套会让"降级"这件事只改了个样式、结构没动。
 * 官方选的是第三条路——**样式降级 + 子块上提**，于是"降级"是真的把这一层抹平。
 *
 * 本模块是纯核：给定一行行的「块 + 缩进 + 是否被降级」，算出每块的最终缩进与顺序。
 */

export interface FlattenRow {
  /** 稳定块 id。 */
  blockId: string;
  /** 缩进层级（0 起）。 */
  indent: number;
  /** 该块是否被降级（降级后子块上提）。 */
  downgraded: boolean;
}

export interface FlattenResult {
  blockId: string;
  indent: number;
}

/**
 * 把每个降级块的**直接与间接子块**（缩进更深的后继兄弟）提到降级块之后、缩进改为降级块的层级。
 * 顺序保持不变（上提＝整体平移，不重排）。未被降级的块缩进原样。
 *
 * ☆ 只在**连续区间**内上提：缩进不深于降级块的第一个兄弟即为区间终点（与 `indent-run.ts`
 *   同一套"整块"边界），所以降级不会把后面无关的块卷进来。
 */
export function flattenDowngrade(rows: FlattenRow[]): FlattenResult[] {
  const out: FlattenResult[] = [];
  let index = 0;
  while (index < rows.length) {
    const row = rows[index];
    if (!row.downgraded) {
      out.push({ blockId: row.blockId, indent: row.indent });
      index += 1;
      continue;
    }
    // 降级块自己：缩进不变（它只是换了样式），先把子块整批提上来。
    out.push({ blockId: row.blockId, indent: row.indent });
    let cursor = index + 1;
    while (cursor < rows.length && rows[cursor].indent > row.indent) {
      out.push({ blockId: rows[cursor].blockId, indent: row.indent });
      cursor += 1;
    }
    index = cursor;
  }
  return out;
}
