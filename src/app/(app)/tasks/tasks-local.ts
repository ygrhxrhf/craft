import type { TaskSchedule } from '@/actions/task/task';

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
 * 键必须逐字落在 SYNC_TABLES.task 的 16 列白名单内：服务端会求交丢弃白名单外键，
 * 但**本地 store 没有这道闸门**，写进去的脏键会直接被离线期的 UI 读到。
 */
export const TASK_WS_COLS = [
  'id', 'userId', 'documentId', 'blockId', 'title', 'isCompleted', 'dueDate', 'remindAt',
  'recurrence', 'recurrenceEnd', 'completedAt', 'status', 'order', 'createdAt', 'updatedAt', 'deletedAt',
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
