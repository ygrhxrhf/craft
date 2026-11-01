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
  /** 固定顺序（0 基，越小越靠前）。 */
  order: number;
}

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
 * 固定/取消固定的一步：已固定 ⇒ 摘掉（取消固定）；未固定 ⇒ 追加到末尾（固定）。
 * 返回新的固定列表，顺序保持。
 */
export function togglePinned(pinned: PinnedDocument[], documentId: string): PinnedDocument[] {
  const exists = pinned.some((row) => row.documentId === documentId);
  if (exists) return pinned.filter((row) => row.documentId !== documentId);
  const nextOrder = pinned.reduce((max, row) => Math.max(max, row.order + 1), 0);
  return [...pinned, { documentId, order: nextOrder }];
}
