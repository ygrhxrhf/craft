/**
 * `gap.md` G52 — the official task has a **third** state next to done.
 *
 * The line-value mapping is verbatim in `docs/craft-ref/features/tasks.md:11`:
 * `Unchecked → "todo"`, `Checked → "completed"`, `Canceled → "cancelled"`. Two facts follow from
 * it and are what this file pins down:
 *
 * - It is one axis, not two booleans: a cancelled block is *not* a completed block, so marking a
 *   task cancelled unchecks it. The checkbox cycle is verbatim at `tasks.md:12` —
 *   `Unchecked → Checked`, `Checked → Unchecked`, **`Canceled → Unchecked`** — so a cancelled task
 *   clicked once goes back to plain unchecked, *not* to done. The local `Task.status` column
 *   already stores a string, so the projection needs no new value — only `cancelledAt`.
 * - Cancellation carries its own timestamp next to the completion one (`tasks.canceled.on`
 *   「已于 [0] 取消」 beside `tasks.completed.on` 「完成于 [0]」, `tasks.md:104`), which is why the
 *   node attr is a date and not just a flag.
 *
 * `doing` is kept as-is: it is a local extra (tasks.md:16 records that official Craft has no such
 * value), and removing it is a different ledger question from adding the missing official state.
 */

import { fillPositional } from '@/lib/i18n/interpolation';

export type TaskLineStatus = 'todo' | 'done' | 'cancelled';

/** 投影进 `Task.status` 的就是这三枚值；官方词表里的 `completed` 在本地列里历来写作 `done`。 */

export interface TaskAttrs {
  checked: boolean;
  cancelled: boolean;
  /** ISO string, or `null` while the block is not cancelled. */
  cancelledAt: string | null;
}

/** 「已取消」 (`tasks.cancelled`) and the timestamped sentence 「已于 [0] 取消」 (`tasks.canceled.on`). */
export const CANCELLED_LABEL = '已取消';
export const CANCELLED_ON_TEXT = '已于 [0] 取消';

/**
 * G516: the official wire value is a three-value numeric enum — `Unchecked:0 / Checked:1 /
 * Canceled:2`. The local column keeps the string spelling (`todo`/`done`/`cancelled`); this pair
 * is the translation the codec uses so the two representations cannot drift apart.
 */
export const TODO_STATE = { Unchecked: 0, Checked: 1, Canceled: 2 } as const;

export function todoStateOf(status: TaskLineStatus): number {
  if (status === 'cancelled') return TODO_STATE.Canceled;
  return status === 'done' ? TODO_STATE.Checked : TODO_STATE.Unchecked;
}

export function statusFromTodoState(state: unknown): TaskLineStatus {
  if (state === TODO_STATE.Canceled) return 'cancelled';
  if (state === TODO_STATE.Checked) return 'done';
  return 'todo';
}

export function taskLineStatus(attrs: Pick<TaskAttrs, 'checked' | 'cancelled'>): TaskLineStatus {
  if (attrs.cancelled) return 'cancelled';
  return attrs.checked ? 'done' : 'todo';
}

/**
 * 官方日历契约（`api-contract.md:36`）：默认只看 pending，开关打开才连同 completed 与 cancelled
 * 一起显示。pending 因此是"既没完成也没取消"，不是"未完成"。
 */
export function isPending(status: TaskLineStatus | 'doing'): boolean {
  return status === 'todo' || status === 'doing';
}

/**
 * 标记／取消标记。取消走的是互斥那一轴：置为已取消同时把勾去掉；反向只清取消态，
 * 不动勾选（"不再算已取消"与"它完成了"是两件事）。已经是这个值就原样返回同一枚对象，
 * 并且**不覆盖**第一次落下的时间戳＝「已于 [0] 取消」讲的始终是取消那一刻。
 */
export function applyCancelled(attrs: TaskAttrs, cancelled: boolean, now: Date): TaskAttrs {
  if (cancelled) {
    if (attrs.cancelled) return attrs;
    return { checked: false, cancelled: true, cancelledAt: now.toISOString() };
  }
  if (!attrs.cancelled) return attrs;
  return { ...attrs, cancelled: false, cancelledAt: null };
}

/** 勾上＝完成，同时退出已取消；取消勾选只改完成轴，不把任务变成已取消。 */
export function applyChecked(attrs: TaskAttrs, checked: boolean): TaskAttrs {
  if (checked) {
    if (attrs.checked && !attrs.cancelled) return attrs;
    return { ...attrs, checked: true, cancelled: false, cancelledAt: null };
  }
  return attrs.checked ? { ...attrs, checked: false } : attrs;
}

/**
 * 勾选框的那一次点击＝`tasks.md:12` 的三值循环。已取消那一档回到"未勾选"，
 * 而不是直接变成完成——把「取消」当成"反义的完成"就会在这一格里走出一条官方没有的边。
 */
export function applyToggled(attrs: TaskAttrs): TaskAttrs {
  if (attrs.cancelled) return { checked: false, cancelled: false, cancelledAt: null };
  return applyChecked(attrs, !attrs.checked);
}

/**
 * 「已于 [0] 取消」的日期串由调用方给（面板与列表用的格式不同），这里只保证占位符按官方词表填。
 */
export function cancelledOnText(dateText: string): string {
  return fillPositional(CANCELLED_ON_TEXT, [dateText]);
}
