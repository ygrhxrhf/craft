/**
 * `gap.md` G1637 —— 增量流的**每行同步时刻**。
 *
 * `document`／`whiteboard` 的时间戳列是 `metaUpdatedAt`，而这一列在契约里**可空、也没有 DB 默认**
 * （`updatedAt` 才有 onCreate/onUpdate 生成器）。历史行（迁移前建的）因此可能 `metaUpdatedAt = NULL`：
 *  - GET 侧旧写法 `if (!syncTsRaw) continue` ⇒ **整行被跳过**：那篇文档永远不出现在任何别的设备上，
 *    本机镜像里的那一份还会在 G1635 的全量对账里被当成"服务端没有"而删掉（本地看不出来是丢数据）。
 *  - 反过来，`metaUpdatedAt` 是一枚**坏字符串**时，`new Date(...).toISOString()` 会抛
 *    "Invalid time value" ⇒ 整次 pull 500 ⇒ 客户端反复重拉同一页（G1630 同族的读侧版本）。
 *
 * 两处都收在这里：**优先取 tsCol，取不到（缺失/空/坏值）退回 `updatedAt`**（该列带生成器、必定有值）；
 * 两列都不可用才返回 `null`（调用方按"这一行没有可用时刻"跳过，且不再抛错）。
 */
export function effectiveRowTs(
  row: Record<string, unknown> | null | undefined,
  tsCol: string,
): string | null {
  if (!row) return null;
  const candidates = tsCol === 'updatedAt' ? ['updatedAt'] : [tsCol, 'updatedAt'];
  for (const col of candidates) {
    const raw = row[col];
    if (typeof raw !== 'string' && !(raw instanceof Date)) continue;
    const at = new Date(raw as string | Date);
    if (!Number.isNaN(at.getTime())) return at.toISOString();
  }
  return null;
}
