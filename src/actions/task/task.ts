'use server';

import { auth } from '@/lib/auth/auth';
import { requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { nextOccurrence, parseRecurrence } from '@/lib/task/recurrence';
import { listsTaskFromDocument } from '@/lib/task/display';
import { applyToggled, taskLineStatus, type TaskAttrs } from '@/lib/editor/task-status';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';

// I2：任务表用 updatedAt 自动 bump（无需 metaUpdatedAt），落库后广播即可；
// 失败不阻断业务（与 updateDocument 的 emit 姿态一致）。
const emitTasks = (db: any, userId: string, id: string) =>
  emitSyncEventSafe(db, userId, ['task'], id);

function updateTaskNode(
  content: unknown,
  blockId: string,
  attrs: { checked: boolean; cancelled?: boolean; cancelledAt?: string | null },
): unknown {
  const next = JSON.parse(JSON.stringify(content));
  let updated = false;
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'taskItem' && node.attrs?.taskId === blockId) {
      node.attrs = { ...node.attrs, ...attrs };
      updated = true;
      return;
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(next);
  return updated ? next : content;
}

async function syncTaskToDocument(
  db: any,
  task: any,
  attrs: { checked: boolean; cancelled?: boolean; cancelledAt?: string | null },
) {
  if (!task.documentId || !task.blockId) return;
  const document = await db.orm.public.Document.first({ id: task.documentId });
  if (!document || !(document as any).content) return;
  const content = updateTaskNode((document as any).content, task.blockId, attrs);
  if (content !== (document as any).content) {
    await db.orm.public.Document.where({ id: task.documentId }).update({ content });
  }
}

export interface TaskItem {
  id: string;
  title: string;
  isCompleted: boolean;
  /** 官方三档落在同一枚轴上（`status` 列）：`todo`／`done`／`cancelled`。 */
  status: 'todo' | 'done' | 'cancelled';
  cancelledAt: string | null;
  dueDate: string | null;
  /** G15: 计划哪天做；与 dueDate（截止）独立。 */
  scheduleDate: string | null;
  remindAt: string | null;
  recurrence: string | null;
  recurrenceEnd: string | null;
  documentId: string | null;
  documentTitle?: string | null;
  /** 「即将进行」的节内排序要用它做同排期时的次级比较（官方 `createdMs`），只读路径。 */
  createdAt?: string | null;
}

/**
 * 文档正文里的 taskItem 属性（`checked` + `cancelled`）是这条任务的唯一输入，三档的裁定权在
 * `task-status.ts` 那个纯核里——投影只把它翻译成列，不在这里再写一遍状态机（写两遍＝会分叉）。
 */
function taskProjection(task: { isCompleted: boolean; cancelled?: boolean; cancelledAt?: string | null }) {
  const line = taskLineStatus({ checked: task.isCompleted, cancelled: !!task.cancelled });
  return {
    isCompleted: line === 'done',
    status: line,
    cancelledAt: line === 'cancelled' ? (task.cancelledAt ?? null) : null,
  };
}

export async function syncDocumentTasks(
  documentId: string,
  tasks: {
    taskId: string;
    title: string;
    isCompleted: boolean;
    remindAt?: string | null;
    cancelled?: boolean;
    cancelledAt?: string | null;
  }[]
) {
  const userId = await requireUserId();
  await requireDocumentAccess(documentId, userId, 'editor');

  const db = await getDb();
  const existing = await db.orm.public.Task
    .where({ documentId, userId })
    .all();

  const incoming = new Map(tasks.map((task) => [task.taskId, task]));
  const existingByBlockId = new Map(
    existing
      .filter((task: any) => typeof task.blockId === 'string' && task.blockId)
      .map((task: any) => [task.blockId, task]),
  );

  // I2：本保存批次任一派生变更（复活/新建/改写/清退）只发一次广播
  let mutated = false;

  for (const [taskId, task] of incoming) {
    const match = existingByBlockId.get(taskId);
    const cols = taskProjection(task);
    if (match) {
      const tombstoned = Boolean((match as any).deletedAt);
      if (
        tombstoned ||
        (match as any).title !== task.title ||
        (match as any).isCompleted !== cols.isCompleted ||
        (match as any).status !== cols.status ||
        ((match as any).cancelledAt ?? null) !== cols.cancelledAt ||
        ((match as any).remindAt ?? null) !== (task.remindAt ?? null)
      ) {
        // 命中墓碑行且 block 重新出现 → 清墓碑复活（恢复"任务重新可见"语义）
        await db.orm.public.Task.where({ id: (match as any).id }).update({
          ...(tombstoned ? { deletedAt: null, updatedAt: new Date().toISOString() } : {}),
          title: task.title,
          ...cols,
          remindAt: task.remindAt ?? null,
        });
        mutated = true;
      }
    } else {
      await db.orm.public.Task.create({
        id: crypto.randomUUID(),
        userId,
        documentId,
        blockId: taskId,
        title: task.title,
        ...cols,
        remindAt: task.remindAt ?? null,
      });
      mutated = true;
    }
  }

  for (const t of existing) {
    const row = t as any;
    // 已墓碑行跳过：避免每次保存重写 deletedAt/updatedAt（时间戳抖动 + 重复 sync 删除事件）
    if (typeof row.blockId === 'string' && !incoming.has(row.blockId) && !row.deletedAt) {
      await db.orm.public.Task.where({ id: row.id }).update({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      mutated = true;
    }
  }

  if (mutated) await emitTasks(db, userId, documentId);
}

export async function getTasks(): Promise<TaskItem[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const tasks = await db.orm.public.Task
    .where({ userId: session.user.id, deletedAt: null })
    .orderBy((t: any) => t.createdAt.desc())
    .limit(200)
    .all();

  const items: TaskItem[] = [];
  for (const t of tasks) {
    const row = t as any;
    let documentTitle: string | null = null;
    const doc = row.documentId
      ? await db.orm.public.Document.first({ id: row.documentId })
      : null;
    if (!listsTaskFromDocument(row.documentId ?? null, doc ? { isDeleted: (doc as any).isDeleted } : null)) {
      continue;
    }
    if (doc && !(doc as any).isDeleted) documentTitle = (doc as any).title;
    items.push({
      id: row.id,
      title: row.title,
      isCompleted: row.isCompleted,
      status: row.status === 'cancelled' || row.status === 'done' ? row.status : 'todo',
      cancelledAt: row.cancelledAt ?? null,
      dueDate: row.dueDate,
      scheduleDate: row.scheduleDate ?? null,
      remindAt: row.remindAt,
      recurrence: row.recurrence,
      recurrenceEnd: row.recurrenceEnd,
      documentId: row.documentId,
      documentTitle,
      createdAt: row.createdAt,
    });
  }
  // pending 在前，完成与取消都算"退场"——三档是一枚轴，排序只看是不是还活着
  const rank = (item: TaskItem) => (item.status === 'todo' ? 0 : 1);
  items.sort((a, b) => rank(a) - rank(b));
  return items;
}

export async function createTask(title: string, dueDate?: string | null, scheduleDate?: string | null) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  if (!title.trim()) throw new Error('标题不能为空');

  const db = await getDb();
  const task = await db.orm.public.Task.create({
    id: crypto.randomUUID(),
    userId: session.user.id,
    title: title.trim(),
    dueDate: dueDate ?? null,
    scheduleDate: scheduleDate ?? null,
  });
  await emitTasks(db, session.user.id, (task as any).id ?? '');
  return task;
}

export async function toggleTask(id: string, timeZone?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const task = await db.orm.public.Task.first({ id });
  if (!task || (task as any).userId !== session.user.id) throw new Error('未授权');

  // 三档只有一枚轴（tasks.md:11），而勾选框那一次点击走的是三值循环（tasks.md:12＝
  // Canceled 回到"未勾选"而不是"完成"）。判定全部走 `task-status.ts` 那个纯核，这里不重复写状态机。
  const current: TaskAttrs = {
    checked: (task as any).isCompleted,
    cancelled: (task as any).status === 'cancelled',
    cancelledAt: (task as any).cancelledAt ?? null,
  };
  const next = applyToggled(current);
  await db.orm.public.Task.where({ id }).update({
    isCompleted: next.checked,
    status: next.cancelled ? 'cancelled' : next.checked ? 'done' : 'todo',
    completedAt: next.checked ? new Date().toISOString() : null,
    cancelledAt: next.cancelledAt,
  });
  await syncTaskToDocument(db, task, {
    checked: next.checked,
    cancelled: next.cancelled,
    cancelledAt: next.cancelledAt,
  });

  if (next.checked) await rollForward(db, task as any, timeZone);
  // rollForward 可能派生下一期任务行——同一次 toggle 合并为一次广播
  await emitTasks(db, session.user.id, id);
  return next.checked;
}

/**
 * A recurring task repeats by spawning the next occurrence rather than by
 * clearing itself, so the completed one stays as history.
 */
async function rollForward(db: any, task: any, timeZone?: string): Promise<void> {
  if (!parseRecurrence(task.recurrence)) return;

  const base = task.dueDate ?? task.remindAt;
  const from = base ? new Date(base) : new Date();
  const upcoming = nextOccurrence(task.recurrence, from, timeZone);
  if (!upcoming) return;

  let remindAt: string | null = null;
  if (task.remindAt) {
    const lead = base ? new Date(base).getTime() - new Date(task.remindAt).getTime() : 0;
    remindAt = new Date(upcoming.getTime() - lead).toISOString();
  }

  await db.orm.public.Task.create({
    id: crypto.randomUUID(),
    userId: task.userId,
    title: task.title,
    documentId: null,
    blockId: null,
    isCompleted: false,
    status: 'todo',
    dueDate: upcoming.toISOString(),
    remindAt,
    recurrence: task.recurrence,
    recurrenceEnd: task.recurrenceEnd,
    order: task.order,
  });
}

export interface TaskSchedule {
  dueDate: string | null;
  /** G15: 计划哪天做；与 dueDate（截止）独立。 */
  scheduleDate: string | null;
  remindAt: string | null;
  recurrence: string | null;
  recurrenceEnd: string | null;
}

export async function setTaskSchedule(id: string, schedule: TaskSchedule) {
  const userId = await requireUserId();

  const db = await getDb();
  const task = await db.orm.public.Task.first({ id });
  if (!task || (task as any).userId !== userId) throw new Error('未授权');

  if (schedule.recurrence && !parseRecurrence(schedule.recurrence)) throw new Error('重复规则无法识别');

  await db.orm.public.Task.where({ id }).update({
    dueDate: schedule.dueDate,
    scheduleDate: schedule.scheduleDate,
    remindAt: schedule.remindAt,
    recurrence: schedule.recurrence,
    recurrenceEnd: schedule.recurrenceEnd,
  });
  await emitTasks(db, userId, id);
}

export async function deleteTask(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const task = await db.orm.public.Task.first({ id });
  if (!task || (task as any).userId !== session.user.id) throw new Error('未授权');

  await db.orm.public.Task.where({ id }).update({
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await emitTasks(db, session.user.id, id);
}
