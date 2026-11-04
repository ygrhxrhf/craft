/**
 * G453 —— 集合 `linkToBlock` 列的落库形状是 **`{ name, url }` 快照**，不是 blockId。
 *
 * 官方那句（`model.md` §一之十三 4）：保存时 `items.map(({name,url}) => …)` ⇒ 类型名与存储形态相反——
 * 存下来的是**当时**的展示名和地址快照，**改名/移动之后不再跟随**（活引用是正文里的 `blockLink`
 * 那一套，见 `BlockLinkMenu`，两者不要混）。
 *
 * 选择器是"带搜索框的弹层"，数据源就是全部块（官方 `blocksRef = docStore.blocks`）；本地用
 * `searchBlockAnchors` 拿同名同形的命中，再用 `anchorHref` 拼出目标地址。
 */

export interface LinkToBlockValue {
  name: string;
  url: string;
}

/** 命中一条块时写进单元格的值：`name` 用块文本的短标签，`url` 是可以直接跳的地址。 */
export function linkToBlockValue(name: string, url: string): LinkToBlockValue | null {
  const trimmed = name.trim();
  if (!trimmed || !url) return null;
  return { name: trimmed, url };
}

/** 单元格里存的是一段 JSON 文本；读不懂就按"没有快照"处理（老数据是裸文本，另行兼容）。 */
export function parseLinkToBlock(raw: unknown): LinkToBlockValue | null {
  let value = raw;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text.startsWith('{')) return null;
    try {
      value = JSON.parse(text);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.name !== 'string' || typeof record.url !== 'string') return null;
  const name = record.name.trim();
  if (!name || !record.url) return null;
  return { name, url: record.url };
}

/** 写进 `CollectionValue.value` 的那一段文本。 */
export function serializeLinkToBlock(value: LinkToBlockValue): string {
  return JSON.stringify({ name: value.name, url: value.url });
}

/** 弹层里一行怎么显示：块文本截短成 40 字，空的给一句占位。 */
export function hitLabel(text: string): string {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return '（空块）';
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}
