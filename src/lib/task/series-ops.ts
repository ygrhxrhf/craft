/**
 * G260 —— 重复序列的**批量操作有五条**（`tasks.md` §八）。
 *
 * 官方那五条键（`_harvest/i18n-zh.tsv`）：
 *   - `tasks.complete.remaining`「完成剩余」（:3268）
 *   - `tasks.cancel.remaining`「取消剩余」（:3264）
 *   - `tasks.delete.remaining`「删除剩余」（:3283）
 *   - `tasks.move.remaining`「将剩余内容移至…」（:3316）
 *   - `tasks.reschedule.tasks`「重新安排任务」（:3334，批量改期）
 *
 * 「剩余」＝同一序列里**该条之后**的未完成项。本模块给出批量操作的枚举与"哪些项算剩余"的判据。
 */

export type SeriesOpId = 'completeRemaining' | 'cancelRemaining' | 'deleteRemaining' | 'moveRemaining' | 'reschedule';

export interface SeriesOp {
  id: SeriesOpId;
  label: string;
  key: string;
}

export const SERIES_OPS: readonly SeriesOp[] = [
  { id: 'completeRemaining', label: '完成剩余', key: 'tasks.complete.remaining' },
  { id: 'cancelRemaining', label: '取消剩余', key: 'tasks.cancel.remaining' },
  { id: 'deleteRemaining', label: '删除剩余', key: 'tasks.delete.remaining' },
  { id: 'moveRemaining', label: '将剩余内容移至…', key: 'tasks.move.remaining' },
  { id: 'reschedule', label: '重新安排任务', key: 'tasks.reschedule.tasks' },
] as const;

/** 序列里的一项：靠 `rootTaskBlockId` 圈定同一条序列，`occurrenceIndex` 是它在序列中的位次。 */
export interface SeriesItem {
  blockId: string;
  rootTaskBlockId: string;
  occurrenceIndex: number;
  done: boolean;
  cancelled?: boolean;
}

/**
 * 某条序列里、**该条之后**的剩余项（批量操作的落点）。
 * - 同 `rootTaskBlockId` 才算同一条序列；
 * - 只取 `occurrenceIndex` 更大的（"剩余"＝还没到的那些）；
 * - 已完成/已取消的不算剩余。
 */
export function remainingItems(items: SeriesItem[], from: SeriesItem): SeriesItem[] {
  return items
    .filter(
      (item) =>
        item.rootTaskBlockId === from.rootTaskBlockId &&
        item.occurrenceIndex > from.occurrenceIndex &&
        !item.done &&
        !item.cancelled,
    )
    .sort((a, b) => a.occurrenceIndex - b.occurrenceIndex);
}

/** 该不该给这条序列露出批量菜单：只有存在剩余项时才露。 */
export function hasRemaining(items: SeriesItem[], from: SeriesItem): boolean {
  return remainingItems(items, from).length > 0;
}
