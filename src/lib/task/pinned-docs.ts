/**
 * G263 —— 任务屏的**固定文档**区，且靠**拖拽填充**（`tasks.md`）。
 *
 * 官方那一组键（`_harvest/i18n-zh.tsv:3284-3369`）：
 *   - `tasks.pin.document`「固定文档」/ `tasks.unpin.document`「取消固定文档」；
 *   - `tasks.pin.existing.doc`「固定现有文档」/ `tasks.tap.to.pin.doc`「点按即可固定现有文档」；
 *   - `tasks.tasks.empty.page`「**拖放文档即可固定**并查看更多详细信息」；
 *   - `tasks.show.pinned`「显示固定内容」；
 *   - 另有 `tasks.subtasks`「子任务」与 `tasks.docs.with.tasks`「带任务的文档」两个分组名。
 *
 * 本模块把这一区的文案、空态判据与"哪些文档该显示"的过滤写出来。
 */

export const PIN_COPY = {
  pin: { key: 'tasks.pin.document', label: '固定文档' },
  unpin: { key: 'tasks.unpin.document', label: '取消固定文档' },
  pinExisting: { key: 'tasks.pin.existing.doc', label: '固定现有文档' },
  tapToPin: { key: 'tasks.tap.to.pin.doc', label: '点按即可固定现有文档' },
  emptyPage: { key: 'tasks.tasks.empty.page', label: '拖放文档即可固定并查看更多详细信息' },
  showPinned: { key: 'tasks.show.pinned', label: '显示固定内容' },
} as const;

export const SUBTASKS_LABEL = { key: 'tasks.subtasks', label: '子任务' } as const;
export const DOCS_WITH_TASKS_LABEL = { key: 'tasks.docs.with.tasks', label: '带任务的文档' } as const;

export interface PinnedDocument {
  documentId: string;
  /** The document's title, for the pinned chip (absent when only the id is known). */
  title?: string;
  /** 收藏行自己的 id：重排写的是 `favorite.order`，文档 id 不是这一行的主键。 */
  favoriteId?: string;
  /** 固定顺序（0 基，越小越靠前）。 */
  order: number;
}

/** 固定上限：官方 `xne = 5`，超出就不再收新的（已固定的重排不受影响）。 */
export const PIN_LIMIT = 5;

/**
 * 超限提示：官方在 JS 里硬编码英文（`Fin` 里那句 `flashMessage`），zh／en 两份 i18n 都没有它，
 * 故照抄原文而不是自造中文（同 `official-copy.ts` 的口径）。
 */
export const PIN_LIMIT_COPY = {
  title: "Can't pin document",
  description: `You can only pin up to ${PIN_LIMIT} documents.`,
} as const;

/**
 * 固定区该显示哪些文档：按 `order` 升序。**空列表触发空态**（那句"拖放文档即可固定"）。
 */
export function pinnedInOrder(pinned: PinnedDocument[]): PinnedDocument[] {
  return [...pinned].sort((a, b) => a.order - b.order);
}

/** 固定区是否该显示空态（官方那句"拖放文档即可固定"）。 */
export function showsEmptyState(pinned: PinnedDocument[]): boolean {
  return pinned.length === 0;
}

/**
 * 固定/重排一步（官方 `Wsn`）：
 * - 无锚（`afterDocumentId == null`）⇒ 插到**最前**（官方 `unshift`）；
 * - 锚就是自己 ⇒ 不动；
 * - 否则把这篇从原位摘掉、紧跟锚后插入（官方 `flatMap`——锚不在列表时这篇会被摘掉，照抄）；
 * - 末了保序去重（官方 `f1`），再重排 `order` 0…n-1。
 */
export function pinAfter(
  pinned: PinnedDocument[],
  documentId: string,
  afterDocumentId?: string | null,
): PinnedDocument[] {
  const ordered = pinnedInOrder(pinned);
  const ids = ordered.map((row) => row.documentId);
  const inserted =
    afterDocumentId == null
      ? [documentId, ...ids]
      : afterDocumentId === documentId
        ? ids
        : ids.flatMap((id) => (id === documentId ? [] : id === afterDocumentId ? [id, documentId] : [id]));
  const seen = new Set<string>();
  const deduped = inserted.filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
  const byId = new Map(ordered.map((row) => [row.documentId, row]));
  return deduped.map((id, order) => ({ ...(byId.get(id) ?? { documentId: id }), order }));
}

/** 取消固定（官方 `zsn`）：摘掉这篇，剩下的重排。 */
export function unpinPinned(pinned: PinnedDocument[], documentId: string): PinnedDocument[] {
  return pinnedInOrder(pinned)
    .filter((row) => row.documentId !== documentId)
    .map((row, order) => ({ ...row, order }));
}

/** 这道闸只拦**新**固定：已固定的重排永远放行（官方 `Fin` 的 `!includes` 条件）。 */
export function canPin(pinned: PinnedDocument[], documentId: string): boolean {
  return pinned.some((row) => row.documentId === documentId) || pinned.length < PIN_LIMIT;
}
