/**
 * Bulk operations are **partial-success** officially: every selected document is attempted, and
 * the caller learns how many failed (`gap.md` G88, keys `alert.could.not.delete.*`). The loop this
 * replaces aborted on the first rejection, which is exactly the "all or nothing" behaviour the
 * ledger records as a difference — the remaining ids were never even attempted.
 */
import {
  COULD_NOT_DELETE_DOCUMENT,
  COULD_NOT_RESTORE_FROM_TRASH,
} from '@/lib/browse/trash-subcopy';

export interface BulkOutcome {
  succeeded: string[];
  failed: { id: string; message: string }[];
}

export async function runBulkAction(
  ids: readonly string[],
  action: (id: string) => Promise<void>,
): Promise<BulkOutcome> {
  const succeeded: string[] = [];
  const failed: { id: string; message: string }[] = [];
  for (const id of ids) {
    try {
      await action(id);
      succeeded.push(id);
    } catch (error) {
      failed.push({ id, message: error instanceof Error ? error.message : '操作失败' });
    }
  }
  return { succeeded, failed };
}

/**
 * Verbatim from the language pack: `alert.could.not.delete.document` (everything failed) and
 * `alert.could.not.delete.some.documents` (only some did). No alert for a clean run — the official
 * keys describe failures, and a success toast would be local copy.
 */
export function bulkDeleteAlert(failedCount: number, totalCount: number): string | null {
  if (failedCount === 0) return null;
  if (failedCount === totalCount) return COULD_NOT_DELETE_DOCUMENT;
  return '无法删除某些文档';
}

/**
 * `alert.could.not.restore.from.trash`, verbatim. The pack has no "some restores failed" variant,
 * so this one key covers both the partial and the total case on the restore path — a local mapping
 * over official text, not an official decision.
 */
export function bulkRestoreAlert(failedCount: number): string | null {
  return failedCount > 0 ? COULD_NOT_RESTORE_FROM_TRASH : null;
}
