import type { TaskItem, TaskSchedule } from '@/actions/task/task';
import { readLocalRecords, mergePending, type PendingRow } from '@/components/sync/local-records';
import { getSyncManager } from '@/lib/sync-core';
import { planToggle, type ToggleSource } from '@/lib/task/toggle-core';
import { listsTaskFromDocument } from '@/lib/task/display';

/**
 * 任务页离线写路径的 patch 构造器（spec 7.x P1 遗留项）。
 *
 * 两条与前人计划不同的裁定，都是对照代码后的结果：
 *
 * 1. **删除不在这里构造 patch**。`applyLocal` 以 `patch === null` 判定 delete op
 *   （`src/lib/sync-core/index.ts:302`），传 `{ deletedAt, updatedAt }` 会被当成 **upsert**
 *   ⇒ 服务端 delete 分支独占的 `isDeleted:true`（`route.ts:262-263`）拿不到，行不再生效。
 *   删除一律 `applyLocal({ table:'task', id, patch:null })`，墓碑由服务端写。
 * 2. **切换完成态现在也走这里**（2026-11-16 离线写补齐）。它原先留作 Server Action，因为带
 *   两条派生：`syncTaskToDocument`（回写正文 `taskItem` 的 checked）与 `rollForward`（重复
 *   任务派生下一期）。其中状态机与下一期派生已抽进纯核 `toggle-core.ts`，服务端 action 与
 *   客户端 `toggleTaskLocally` 读同一份；正文回写仍留在服务端 action——它读的是
 *   `Document.content` 派生镜像，离线时够不着，而协作文档的正文真源是 Yjs 房间（ADR-0001），
 *   本批不动那条面。
 *
 * 键必须逐字落在 SYNC_TABLES.task 的 19 列白名单内：服务端会求交丢弃白名单外键，
 * 但**本地 store 没有这道闸门**，写进去的脏键会直接被离线期的 UI 读到。
 */
export const TASK_WS_COLS = [
  'id', 'userId', 'documentId', 'blockId', 'title', 'isCompleted', 'dueDate', 'scheduleDate', 'remindAt',
  'recurrence', 'recurrenceEnd', 'seriesId', 'completedAt', 'cancelledAt', 'status', 'order', 'createdAt', 'updatedAt', 'deletedAt',
] as const;

export type TaskPatch = Record<string, unknown>;

/**
 * 离线勾选完成：状态机 + 重复任务下一期，服务端 action 读的是同一份 `toggle-core`。
 *
 * 两个 applyLocal 必须按顺序：先落勾选（本机立刻可见），再落下一期。前者是 patch 合并，
 * 后者是带全铸造列的新行（`createRequires: ['title']`）；推送时队列按 seq 顺序发，
 * 服务端两种都能接住。`nextId` 用 UUID 而不是"派生键"——推送重试复用同一笔队列 op，
 * 同一枚 id 的 upsert 幂等，所以重试不会多派生一行。
 *
 * 不在这里做的：正文 `taskItem` 的回写。它读服务端派生镜像，离线时够不着；
 * `toggleTask` action 仍保留那一段，供服务端路径与在线 fallback 使用。协作文档的正文
 * 由 Yjs 房间写回镜像，这条"列表勾选 → 正文"的同步仍是既有限制（见 ADR-0001）。
 */
export async function toggleTaskLocally(
  task: TaskItem,
  userId: string,
  opts: { timeZone?: string; now?: Date } = {},
): Promise<boolean> {
  const now = opts.now ?? new Date();
  // 与两个调用点原先传给 `toggleTask` 的值同源（设备本地时区，不是 UTC）。
  const timeZone = opts.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  const plan = planToggle(
    { ...task, userId } as ToggleSource,
    now,
    timeZone,
    crypto.randomUUID(),
  );
  const manager = getSyncManager();
  /**
   * 两枚 patch 都写成字面量键（值仍是计算出来的）：`tables.test.ts` 的 G1489 静态闸
   * 只认字面量键，写成 spread 会让"这一笔到底能推哪几列"退化成人工复核。
   */
  await manager.applyLocal({
    table: 'task',
    id: task.id,
    patch: {
      isCompleted: plan.columns.isCompleted,
      status: plan.columns.status,
      completedAt: plan.columns.completedAt,
      cancelledAt: plan.columns.cancelledAt,
      // updatedAt 是同步时刻列（SYNC_TABLES.task.tsCol），不属于状态机，故在这里补。
      updatedAt: now.toISOString(),
    },
  });
  if (plan.next) {
    const next = plan.next;
    await manager.applyLocal({
      table: 'task',
      id: next.id,
      patch: {
        id: next.id,
        userId: next.userId,
        title: next.title,
        documentId: next.documentId,
        blockId: next.blockId,
        isCompleted: next.isCompleted,
        status: next.status,
        dueDate: next.dueDate,
        remindAt: next.remindAt,
        recurrence: next.recurrence,
        recurrenceEnd: next.recurrenceEnd,
        seriesId: next.seriesId,
        order: next.order,
        createdAt: next.createdAt,
        updatedAt: next.updatedAt,
      },
    });
  }
  return plan.columns.isCompleted;
}

export const taskPatchFor = {
  create(
    input: { id: string; userId: string; title: string; dueDate?: string | null; scheduleDate?: string | null },
    now: string,
  ): TaskPatch {
    const patch: TaskPatch = {
      id: input.id,
      userId: input.userId,
      title: input.title.trim(),
      isCompleted: false,
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    };
    // 不给 dueDate 写 null 占位：新建未填截止日的任务与"显式清空截止日"在 patch 语义里不该同形。
    if (input.dueDate) patch.dueDate = input.dueDate;
    if (input.scheduleDate) patch.scheduleDate = input.scheduleDate;
    return patch;
  },

  schedule(s: TaskSchedule, now: string): TaskPatch {
    return {
      dueDate: s.dueDate,
      scheduleDate: s.scheduleDate,
      remindAt: s.remindAt,
      recurrence: s.recurrence,
      recurrenceEnd: s.recurrenceEnd,
      updatedAt: now,
    };
  },
};

/** 新建任务在拿不到 pending 载荷字段时的骨架（与 getTasks 的默认形状对齐）。 */
function taskDefaults(id: string, p: PendingRow): TaskItem {
  const data = p.data ?? {};
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    isCompleted: false,
    status: 'todo',
    cancelledAt: null,
    dueDate: null,
    scheduleDate: null,
    remindAt: null,
    recurrence: null,
    recurrenceEnd: null,
    seriesId: null,
    documentId: null,
    blockId: null,
    documentTitle: null,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : null,
  };
}

/**
 * 服务端行 + 未推送意图 → 任务页视图。
 *
 * 为什么需要这一层：本页写走 `applyLocal`（落本地队列），读走 `getTasks()`（服务端权威行）。
 * 断链时 `flushNow` 把 op 留在队列里重试，服务端那一行**没变**，于是紧随其后的重读会把
 * 刚删掉的任务又画回来、刚新建的任务看不见。文档树／回收站／评论／成员名册都靠
 * `mergePending` 补上这一层，只有任务页此前漏了。
 *
 * 删除不需要特殊 patch：本页删除传的是 `patch: null`，`applyLocal` 据此把 op 记成
 * `'delete'`，`mergePending` 本来就会丢掉这类行。已取消/已完成的行仍要留在视图里
 * （「显示已完成」开关自己决定露不露），所以这里只按 `deletedAt` 滤。
 *
 * 排序要重做：`getTasks` 的「pending 在前」排序发生在服务端合并之后，新插入的本地行
 * 不在那个顺序里。
 */
export function overlayTaskRows(
  rows: TaskItem[],
  pending: Map<string, PendingRow>,
): TaskItem[] {
  const merged = mergePending(rows, pending, taskDefaults);
  const live = merged.filter((task) => {
    // 撤销删除是 upsert 一枚 `deletedAt: null`；软删在服务端仍是 delete op，
    // 但本页也可能收到外部表推送来的墓碑行，两种都要滤。
    const stamp = (task as TaskItem & { deletedAt?: unknown }).deletedAt;
    return stamp == null || stamp === '';
  });
  const rank = (task: TaskItem) => (task.status === 'todo' ? 0 : 1);
  return live.sort((a, b) => rank(a) - rank(b));
}

/** 本地镜像行 → `TaskItem` 的纯映射。与 `getTasksPage` 的投影逐字段同形。 */
export function taskItemsFromMirror(
  rows: Array<{ id: string; op: string; data?: Record<string, unknown> }>,
  documents: Array<{ id: string; op: string; data?: Record<string, unknown> }> = [],
): TaskItem[] {
  const docById = new Map<string, {
    title: string | null;
    isDeleted: boolean;
    isDailyNote: boolean;
    createdAt: string | null;
    updatedAt: string | null;
  }>();
  for (const row of documents) {
    if (row.op === 'delete') continue;
    const data = row.data ?? {};
    if (data.deletedAt) continue;
    docById.set(row.id, {
      title: typeof data.title === 'string' ? data.title : null,
      isDeleted: data.isDeleted === true,
      isDailyNote: data.isDailyNote === true,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : null,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    });
  }

  const items: TaskItem[] = [];
  for (const row of rows) {
    if (row.op === 'delete') continue;
    const data = row.data ?? {};
    if (data.deletedAt) continue;
    const documentId = typeof data.documentId === 'string' && data.documentId ? data.documentId : null;
    const doc = documentId ? docById.get(documentId) ?? null : null;
    // 与 `getTasksPage` 同一条：宿主文档已删的任务不进列表（每日笔记/正文任务共用）。
    if (!listsTaskFromDocument(documentId, doc ? { isDeleted: doc.isDeleted } : null)) continue;
    const status = data.status === 'done' || data.status === 'cancelled' ? data.status : 'todo';
    items.push({
      id: row.id,
      title: typeof data.title === 'string' ? data.title : '',
      isCompleted: data.isCompleted === true,
      status,
      cancelledAt: typeof data.cancelledAt === 'string' ? data.cancelledAt : null,
      dueDate: typeof data.dueDate === 'string' ? data.dueDate : null,
      scheduleDate: typeof data.scheduleDate === 'string' ? data.scheduleDate : null,
      remindAt: typeof data.remindAt === 'string' ? data.remindAt : null,
      recurrence: typeof data.recurrence === 'string' ? data.recurrence : null,
      recurrenceEnd: typeof data.recurrenceEnd === 'string' ? data.recurrenceEnd : null,
      seriesId: typeof data.seriesId === 'string' && data.seriesId ? data.seriesId : null,
      documentId,
      blockId: typeof data.blockId === 'string' && data.blockId ? data.blockId : null,
      documentTitle: doc?.title ?? null,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : null,
      order: typeof data.order === 'number' ? data.order : null,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
      isDailyNote: doc ? doc.isDailyNote : null,
      documentCreatedAt: doc?.createdAt ?? null,
      documentUpdatedAt: doc?.updatedAt ?? null,
    });
  }

  // 服务端按 `(createdAt, id)` 递减；镜像侧用同一口径，跨页顺序不会在离线时倒过来。
  return items.sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id.localeCompare(a.id));
}

/**
 * 离线读：服务端 `getTasksPage` 够不着时退回内核镜像。
 * 与评论面板同一条处置（`CommentSection.reload`）——断链时本地写入仍看得见。
 * 宿主文档的标题/删除态从 `document` 镜像补；拿不到就留空，不伪造。
 */
export async function readTaskMirrorItems(): Promise<TaskItem[]> {
  const [tasks, documents] = await Promise.all([
    readLocalRecords('task'),
    readLocalRecords('document'),
  ]);
  return taskItemsFromMirror(tasks, documents);
}
