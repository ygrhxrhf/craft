/**
 * The 「最近删除」 subsystem's strings and rules (G233). Retention is 30 days; emptying is a
 * permanent delete behind a confirmation; and the two failure paths each have their own sentence
 * rather than sharing a generic one.
 *
 * The four confirmation keys the ledger records split by count (one / other) and by single /
 * batch, so the confirm sentence is chosen by how many items are being moved.
 */

/** Retention, and the sentence that states it. */
export const TRASH_RETENTION_DAYS = 30;

/** Emptying the trash: the confirmation title, verbatim. */
export const EMPTY_TRASH_CONFIRM = '你确定要永久删除这些项目吗？';
export const EMPTY_TRASH_CONFIRM_KEY = 'alert.empty.trash.title';

export const EMPTY_TRASH_ACTION = '清空最近删除';
export const EMPTY_TRASH_ACTION_KEY = 'commands.empty.trash';

export const PERMANENT_DELETE_DOCUMENT = '永久删除文档';
export const PERMANENT_DELETE_DOCUMENT_KEY = 'commands.delete.permanently';

/** The two failure paths, each with its own sentence. */
export const COULD_NOT_DELETE_DOCUMENT = '无法删除文档';
export const COULD_NOT_DELETE_DOCUMENT_KEY = 'alert.could.not.delete.document';

export const COULD_NOT_RESTORE_FROM_TRASH = '无法从最近删除中恢复文档';
export const COULD_NOT_RESTORE_FROM_TRASH_KEY = 'alert.could.not.restore.from.trash';

/** The move-to-trash confirmations, split by count. */
export const MOVE_ITEM_TO_TRASH = '此项目将移至最近删除。';
export const MOVE_ITEMS_TO_TRASH = '这些项目将移至最近删除。';

/**
 * The delete menu entry's own title is dynamic (G245): a single item names itself, a batch counts
 * itself. Officially the single form quotes the title and the batch form is pluralised by count —
 * they are two keys, not one templated string.
 */
export const MOVE_X_TO_RECENTLY_DELETED_KEY = 'move.x.to.recently.deleted';

export function moveToTrashMenuTitle(title: string): string {
  return `将"${title}"移至最近删除`;
}

/** The sentence shown once the move has actually happened. */
export const MOVED_TO_RECENTLY_DELETED = '已移至最近删除';
export const MOVED_TO_RECENTLY_DELETED_KEY = 'moved.to.recently.deleted';

/** Whether a document is still inside the retention window, given when it was deleted. */
export function isWithinRetention(deletedAt: string | null, now: number = Date.now()): boolean {
  if (!deletedAt) return false;
  const at = Date.parse(deletedAt);
  if (Number.isNaN(at)) return false;
  return now - at <= TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
}

/** The move confirmation, chosen by how many items are selected. */
export function moveToTrashConfirm(count: number): string {
  return count === 1 ? MOVE_ITEM_TO_TRASH : MOVE_ITEMS_TO_TRASH;
}
