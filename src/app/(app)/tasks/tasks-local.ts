import type { TaskItem, TaskSchedule } from '@/actions/task/task';
import { mergePending, type PendingRow } from '@/components/sync/local-records';

/**
 * 任务页离线写路径的 patch 构造器（spec 7.x P1 遗留项）。
 *
 * 两条与前人计划不同的裁定，都是对照代码后的结果：
 *
 * 1. **删除不在这里构造 patch**。`applyLocal` 以 `patch === null` 判定 delete op
 *   （`src/lib/sync-core/index.ts:302`），传 `{ deletedAt, updatedAt }` 会被当成 **upsert**
 *   ⇒ 服务端 delete 分支独占的 `isDeleted:true`（`route.ts:262-263`）拿不到，行不再生效。
 *   删除一律 `applyLocal({ table:'task', id, patch:null })`，墓碑由服务端写。
 * 2. **切换完成态不在这里**。`toggleTask` 除改四列外还有两条服务端派生：
 *   `syncTaskToDocument`（回写文档正文里 taskItem 节点的 checked）与
 *   `rollForward`（重复任务派生下一期新行，要算 `nextOccurrence`）。
 *   客户端没有这两条通路，搬过来＝静默功能回归 ⇒ toggle 保持 Server Action。
 *
 * 键必须逐字落在 SYNC_TABLES.task 的 17 列白名单内：服务端会求交丢弃白名单外键，
 * 但**本地 store 没有这道闸门**，写进去的脏键会直接被离线期的 UI 读到。
 */
export const TASK_WS_COLS = [
  'id', 'userId', 'documentId', 'blockId', 'title', 'isCompleted', 'dueDate', 'remindAt',
  'recurrence', 'recurrenceEnd', 'completedAt', 'cancelledAt', 'status', 'order', 'createdAt', 'updatedAt', 'deletedAt',
] as const;

export type TaskPatch = Record<string, unknown>;

export const taskPatchFor = {
  create(
    input: { id: string; userId: string; title: string; dueDate?: string | null },
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
    return patch;
  },

  schedule(s: TaskSchedule, now: string): TaskPatch {
    return {
      dueDate: s.dueDate,
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
    remindAt: null,
    recurrence: null,
    recurrenceEnd: null,
    documentId: null,
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
