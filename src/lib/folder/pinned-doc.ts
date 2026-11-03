/**
 * G338 —— 官方 `folder_set_pinned`（同步事件面写作 `Folder pinned doc`）的本地语义。
 *
 * 两侧的独立证据：
 * - 写侧（`model.md` §一之三十五）：`folder_set_pinned` 把 `pinnedDocumentIds` 写成
 *   `documentId ? [id] : []` ⇒ **字段是数组，但只放 0 或 1 个＝单选**，取消固定写空数组而不是删属性；
 * - 入口侧（`registries.md` §二 + `tags-browse.md` §八）：落库行为枚举里的 `PIN_ON_DROP`，
 *   对应文案 `browse.drop.here.to.pin.document`「拖放到此处以固定文档」⇒ 触发方式是**拖放**，
 *   被固定的文档不改变自己的所在文件夹（那是 `folder_move` 的事）。
 */

export const FOLDER_PIN_COPY = {
  dropHereToPin: { key: 'browse.drop.here.to.pin.document', label: '拖放到此处以固定文档' },
  /** 区块标题：官方这一枚是单数（`Pinned Doc`），正对上"只放 1 个"。 */
  pinnedDoc: { key: 'tasks.pinned.doc', label: '固定文档' },
  /** 摘掉用通用命令键（`commands.unpin`），`tasks.unpin.document` 是任务屏那一条的长句。 */
  unpin: { key: 'commands.unpin', label: '取消固定' },
} as const;

/** 官方那一档：数组里最多 1 个（多出来的读作脏数据，直接截断）。 */
export const FOLDER_PIN_LIMIT = 1;

/**
 * 读回 `pinnedDocumentIds`：JSON 列在不同通路里可能是已解析的数组，也可能是原始 JSON 文本，
 * 认不出的形状一律当"没有固定"（官方 `delete properties.x` 那一族容错的口径）。
 */
export function parsePinnedDocumentIds(raw: unknown): string[] {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const ids = value.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
  return ids.slice(0, FOLDER_PIN_LIMIT);
}

/** 写侧的一条：固定 ⇒ `[id]`，取消 ⇒ `[]`（对应官方 `documentId ? [id] : []`）。 */
export function pinnedIdsFor(documentId: string | null): string[] {
  return documentId ? [documentId] : [];
}

/** 这个文档是不是该文件夹当前固定的那一枚。 */
export function isFolderPinned(raw: unknown, documentId: string): boolean {
  return parsePinnedDocumentIds(raw).includes(documentId);
}
