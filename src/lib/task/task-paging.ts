/**
 * G604 —— 任务是一层**独立的分页文档缓存**（`model.md` §一之三十五，官方 22 项 store）。
 *
 * 本地任务查询按 `(createdAt, id)` 复合游标分页（`getTasksPage`）；这里把官方那层的**状态形状**
 * 写出来，任务屏用它承接 `nextCursor` 与滚动加载：
 *
 *   - **三个独立游标**：总表 `continuationToken`、进行中 `ongoingTasks`、即将到期 `upcomingTasks`
 *     ——三条查询各翻各的页，互不推进；
 *   - `loadStatus` 三档（`idle` / `loading` / `done`）＋ `pageInfo`；
 *   - 任务写侧的**相对定位**排序：`reorderTasks{blockId, afterBlockId}` 是"插到某任务之后"，
 *     **不是索引**——索引会在并发下失效，相对定位不会。
 */

export type TaskListKey = 'all' | 'ongoing' | 'upcoming';

/** 官方那三个独立游标，各自对应一条查询。 */
export interface TaskCursors {
  /** 总表（`DocumentsWithTasks` 那条）。 */
  continuationToken: string | null;
  /** 进行中（`…OngoingTasks…`）。 */
  ongoingTasks: string | null;
  /** 即将到期（`…UpcomingTasks…`）。 */
  upcomingTasks: string | null;
}

export function emptyTaskCursors(): TaskCursors {
  return { continuationToken: null, ongoingTasks: null, upcomingTasks: null };
}

const CURSOR_FIELD: Record<TaskListKey, keyof TaskCursors> = {
  all: 'continuationToken',
  ongoing: 'ongoingTasks',
  upcoming: 'upcomingTasks',
};

/** 读某条列表的游标。 */
export function cursorFor(cursors: TaskCursors, list: TaskListKey): string | null {
  return cursors[CURSOR_FIELD[list]];
}

/**
 * 推进某条列表的游标。**只动这一条**——三条查询各翻各的页，推进总表不会带动另两条，
 * 这正是官方把三个游标分开的原因。
 */
export function advanceCursor(cursors: TaskCursors, list: TaskListKey, token: string | null): TaskCursors {
  return { ...cursors, [CURSOR_FIELD[list]]: token };
}

/** 加载状态三档（官方 `updateLoadStatus`）。 */
export type LoadStatus = 'idle' | 'loading' | 'done';

export interface TaskPageState {
  cursors: TaskCursors;
  status: LoadStatus;
  /** 服务端给的 `pageInfo`（有无下一页、当前页条数）。 */
  pageInfo: { hasMore: boolean; count: number } | null;
}

export function initialTaskPageState(): TaskPageState {
  return { cursors: emptyTaskCursors(), status: 'idle', pageInfo: null };
}

/** 开始加载某条列表：状态进 `loading`，游标与 pageInfo 不动（翻页失败可原样重试）。 */
export function beginLoad(state: TaskPageState): TaskPageState {
  return { ...state, status: 'loading' };
}

/** 一页落定：推进游标、记 pageInfo、状态按 `hasMore` 收口。 */
export function settleLoad(
  state: TaskPageState,
  list: TaskListKey,
  page: { nextToken: string | null; hasMore: boolean; count: number },
): TaskPageState {
  return {
    cursors: advanceCursor(state.cursors, list, page.nextToken),
    status: page.hasMore ? 'idle' : 'done',
    pageInfo: { hasMore: page.hasMore, count: page.count },
  };
}

/** 重置（官方 `resetFetchDocumentsWithTasks`）：游标与 pageInfo 清空、状态回 `idle`。 */
export function resetTaskPageState(): TaskPageState {
  return initialTaskPageState();
}

/**
 * 追加下一页：按 `id` 去重。首屏叠过本机 pending 行（`overlayTaskRows`），下一页读回同一批行时
 * 不能再画一遍；顺序保持"首屏在前、后页在后"，与服务端的 `(createdAt, id)` 降序一致。
 */
export function appendTaskPage<T extends { id: string }>(current: readonly T[], next: readonly T[]): T[] {
  const seen = new Set(current.map((row) => row.id));
  return [...current, ...next.filter((row) => !seen.has(row.id))];
}

/**
 * 任务重排的**相对定位**：把 `blockId` 插到 `afterBlockId` 之后，返回新的 id 序。
 * `afterBlockId` 为 `null` ⇒ 插到最前（官方"插到某任务之后"的空档语义）。
 * 定位不到 `afterBlockId` ⇒ 原样返回（宁可不动，也不猜一个位置）。
 */
export function reorderAfter(ids: string[], blockId: string, afterBlockId: string | null): string[] {
  if (!ids.includes(blockId)) return ids;
  const without = ids.filter((id) => id !== blockId);
  if (afterBlockId === null) return [blockId, ...without];
  const at = without.indexOf(afterBlockId);
  if (at < 0) return ids;
  return [...without.slice(0, at + 1), blockId, ...without.slice(at + 1)];
}

/** G604：任务分页的每页条数（官方列表分页，不是一次读全表）。 */
export const TASK_PAGE_SIZE = 100;

/**
 * G604 的游标编解码。☆ 放在这里而不是 `actions/task/task.ts`：那个文件是 `'use server'`，
 * **只允许导出 async 函数**——两枚同步导出会让整个模块编译失败（`Server Actions must be async
 * functions`），而那正是"编辑页 500、内容区空白"的成因（单测用 mock 跑不到编译期这道闸）。
 */
export function encodeTaskCursor(row: Record<string, unknown>): string {
  return `${String(row.createdAt ?? '')}|${String(row.id ?? '')}`;
}

export function decodeTaskCursor(cursor: string): { createdAt: string; id: string } {
  const [createdAt, id] = cursor.split('|');
  return { createdAt: createdAt ?? '', id: id ?? '' };
}
