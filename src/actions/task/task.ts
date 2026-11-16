'use server';

import { auth } from '@/lib/auth/auth';
import { requireUserId } from '@/lib/authz/guard';
import { requireDocumentAccess } from '@/lib/authz/document-access';
import { getDb } from '@/prisma/db';
import { parseRecurrence, scheduleWithRecurrence } from '@/lib/task/recurrence';
import { defaultReminderForRepeat, rollForwardReminder } from '@/lib/task/repeat-reminder';
import { listsTaskFromDocument } from '@/lib/task/display';
import { taskLineStatus } from '@/lib/editor/task-status';
import { planToggle } from '@/lib/task/toggle-core';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { reorderAfter, encodeTaskCursor, decodeTaskCursor, TASK_PAGE_SIZE, type TaskListRange } from '@/lib/task/task-paging';
import { deriveSubtasks } from '@/lib/task/subtasks';
import { and, or } from '@prisma/orm-postgres/orm-client';

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

/**
 * G727（`⏎` 编辑）：重命名要同时改任务行与正文里那个 `taskItem` 节点——正文才是任务标题的
 * 唯一输入（见 `taskProjection` 上方注释），只改列会让下一次保存把旧标题写回去。
 */
function renameTaskNode(content: unknown, blockId: string, title: string): unknown {
  const next = JSON.parse(JSON.stringify(content));
  let updated = false;
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'taskItem' && node.attrs?.taskId === blockId) {
      node.content = [{ type: 'paragraph', content: [{ type: 'text', text: title }] }];
      updated = true;
      return;
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(next);
  return updated ? next : content;
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
  /**
   * G260：同一条重复序列的键。客户端离线勾选完成时要用它把派生出的下一期接回同一序列
   * （服务端 `rollForward` 的 fallback 是原行 id，客户端必须拿到同一枚值才不分叉）。
   */
  seriesId: string | null;
  documentId: string | null;
  /** G727：`Ctrl-→` 要跳到正文里这一枚区块（`/documents/{id}#b-{blockId}`）。 */
  blockId: string | null;
  documentTitle?: string | null;
  /** 「即将进行」的节内排序要用它做同排期时的次级比较（官方 `createdMs`），只读路径。 */
  createdAt?: string | null;
  /** G604: 手动排序的落库位次（`Task.order`），拖拽只在 `inboxTaskSort==='manual'` 时放行。 */
  order?: number | null;
  /** G604: `todaySortProperty: 'modified'` 与「按修改时间」文档排序的次级比较键。 */
  updatedAt?: string | null;
  /** G604: 来源文档是不是每日笔记——「显示每日笔记」这枚筛选要按它分档。 */
  isDailyNote?: boolean | null;
  /** G604: 「即将进行」按文档分组时，文档组的排序键（官方 `documentInfo` 的 modified/created）。 */
  documentUpdatedAt?: string | null;
  /** G604: 同上，`documentSort: 'created'` 的一档。 */
  documentCreatedAt?: string | null;
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
    // G357: the two other time semantics ride the task item too, so the document's date fields
    // persist into the task row alongside the reminder.
    scheduleDate?: string | null;
    dueDate?: string | null;
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
      /**
       * G357 的日期两轴只在正文**真的带着值**时才是权威。任务页设的日期从不写进文档
       * （唯一的写入者是编辑器里的快捷面板），所以正文侧恒为 null——若把 null 也当权威，
       * 任务页设的截止日期会在下一次无关的正文保存里被抹成 null。
       */
      const nextSchedule = task.scheduleDate ?? (match as any).scheduleDate ?? null;
      const nextDue = task.dueDate ?? (match as any).dueDate ?? null;
      if (
        tombstoned ||
        (match as any).title !== task.title ||
        (match as any).isCompleted !== cols.isCompleted ||
        (match as any).status !== cols.status ||
        ((match as any).cancelledAt ?? null) !== cols.cancelledAt ||
        ((match as any).remindAt ?? null) !== (task.remindAt ?? null) ||
        ((match as any).scheduleDate ?? null) !== nextSchedule ||
        ((match as any).dueDate ?? null) !== nextDue
      ) {
        // 命中墓碑行且 block 重新出现 → 清墓碑复活（恢复"任务重新可见"语义）
        await db.orm.public.Task.where({ id: (match as any).id }).update({
          ...(tombstoned ? { deletedAt: null, updatedAt: new Date().toISOString() } : {}),
          title: task.title,
          ...cols,
          remindAt: task.remindAt ?? null,
          scheduleDate: nextSchedule,
          dueDate: nextDue,
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
        scheduleDate: task.scheduleDate ?? null,
        dueDate: task.dueDate ?? null,
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

/**
 * G604: the 今天 / 即将进行 lists are filtered on the official **effective** date — 排期，落空则用
 * 截止（`schedule ?? deadline`）。 A range bound is half-open `[from, to)`. Written with the
 * callback form because an operator object in the shorthand compiles to a comparison against a
 * JSON literal and silently matches nothing (`src/prisma/where-shorthand.test.ts`).
 */
function effectiveDateInRange(t: any, range: TaskListRange) {
  const bounds = (field: any) => [
    ...(range.from ? [field.gte(range.from)] : []),
    ...(range.to ? [field.lt(range.to)] : []),
  ];
  return or(
    and(t.scheduleDate.isNotNull(), ...bounds(t.scheduleDate)),
    and(t.scheduleDate.isNull(), t.dueDate.isNotNull(), ...bounds(t.dueDate)),
  );
}

/** G604: the whole list, read through the paged query. The calendar reads this and needs every
 *  row, so the cursor is followed to the end. */
export async function getTasks(): Promise<TaskItem[]> {
  const items: TaskItem[] = [];
  let cursor: string | null = null;
  do {
    const page = await getTasksPage(cursor);
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  // pending 在前，完成与取消都算"退场"——三档是一枚轴，排序只看是不是还活着。
  // 排在拼页之后：页内先排序会让游标续读不再严格按 (createdAt, id) 递减。
  const rank = (item: TaskItem) => (item.status === 'todo' ? 0 : 1);
  items.sort((a, b) => rank(a) - rank(b));
  return items;
}

/**
 * G604: one page of the task list plus the cursor for the next. `getTasks` is the first page; the
 * task screen holds one cursor per tab (`listForGroup`) and asks for more when the reader scrolls.
 * `range` narrows the list to one tab's date window; the bounds are the **viewer's** local day
 * boundaries, so they are computed on the client and sent along.
 */
export async function getTasksPage(
  cursor?: string | null,
  range?: TaskListRange | null,
): Promise<{ items: TaskItem[]; nextCursor: string | null }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  // G604: the task list is a paged cache with a **cursor** (official `continuationToken`), not a
  // single unbounded read. The cursor is the `(createdAt, id)` of the last row returned and seeks
  // strictly older rows, so a growing table does not re-read what was already seen. The keyset is
  // composite and descends on `(createdAt, id)`; asking for one row past the page is the `hasMore`
  // probe — `nextCursor` is only emitted when that probe row exists.
  const after = cursor ? decodeTaskCursor(cursor) : null;
  const base = db.orm.public.Task.where({ userId: session.user.id, deletedAt: null });
  const scoped = range ? base.where((t: any) => effectiveDateInRange(t, range)) : base;
  const pageQuery = scoped
    .orderBy([(t: any) => t.createdAt.desc(), (t: any) => t.id.desc()])
    .limit(TASK_PAGE_SIZE + 1);
  const rows: Record<string, unknown>[] = after
    ? await (pageQuery as any).cursor({ createdAt: after.createdAt, id: after.id }).all()
    : await pageQuery.all();
  const tasks = rows.slice(0, TASK_PAGE_SIZE);
  const nextCursor = rows.length > TASK_PAGE_SIZE ? encodeTaskCursor(tasks[tasks.length - 1]) : null;

  // One read for the page's documents instead of a `Document.first()` round-trip per task.
  const documentIds = [...new Set(tasks.map((row) => String(row.documentId ?? '')).filter(Boolean))];
  const docs: Record<string, unknown>[] = documentIds.length
    ? await db.orm.public.Document
        .where((m: any) => m.id.in(documentIds))
        .select('id', 'title', 'isDeleted', 'isDailyNote', 'createdAt', 'updatedAt')
        .all()
    : [];
  const docById = new Map(docs.map((doc) => [String(doc.id), doc]));

  const items: TaskItem[] = [];
  for (const t of tasks) {
    const row = t as any;
    let documentTitle: string | null = null;
    const doc = row.documentId ? (docById.get(String(row.documentId)) ?? null) : null;
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
      seriesId: typeof row.seriesId === 'string' && row.seriesId ? row.seriesId : null,
      documentId: row.documentId,
      blockId: typeof row.blockId === 'string' && row.blockId ? row.blockId : null,
      documentTitle,
      createdAt: row.createdAt,
      order: typeof row.order === 'number' ? row.order : null,
      updatedAt: row.updatedAt ?? null,
      isDailyNote: doc ? (doc as any).isDailyNote === true : null,
      documentCreatedAt: doc ? ((doc as any).createdAt ?? null) : null,
      documentUpdatedAt: doc ? ((doc as any).updatedAt ?? null) : null,
    });
  }
  return { items, nextCursor };
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

  /**
   * 三档只有一枚轴（tasks.md:11），而勾选框那一次点击走的是三值循环（tasks.md:12＝
   * Canceled 回到"未勾选"而不是"完成"）。状态机与下一期派生都在 `toggle-core.ts` 那一个
   * 纯核里——客户端离线勾选读同一份（`toggleTaskLocally`），这里只负责落库。
   */
  const plan = planToggle(
    { ...(task as any), userId: session.user.id },
    new Date(),
    timeZone ?? 'UTC',
    crypto.randomUUID(),
  );
  await db.orm.public.Task.where({ id }).update(plan.columns);
  await syncTaskToDocument(db, task, {
    checked: plan.columns.isCompleted,
    cancelled: plan.columns.status === 'cancelled',
    cancelledAt: plan.columns.cancelledAt,
  });

  // 下一期可能派生任务行——同一次 toggle 合并为一次广播
  if (plan.next) await db.orm.public.Task.create(plan.next);
  await emitTasks(db, session.user.id, id);
  return plan.columns.isCompleted;
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

  // G652: a repeat with no schedule fills today's local midnight instead of staying dateless.
  const scheduleDate = scheduleWithRecurrence(schedule.recurrence, schedule.scheduleDate, new Date());
  // G667: a repeat with no reminder defaults to 09:00 on that day — only when the repeat is new,
  // so clearing a reminder later is not undone by the next save.
  const isNewRepeat = Boolean(schedule.recurrence) && !Boolean((task as any).recurrence);
  let remindAt = isNewRepeat ? defaultReminderForRepeat(scheduleDate, schedule.remindAt) : schedule.remindAt;
  /**
   * G644: the reminder is an expression — the schedule supplies the date and the previous
   * reminder supplies the minute-of-day. When the day moves and the user did not touch the
   * time, recompute it instead of keeping the old date attached to the absolute instant.
   */
  const previousRemindAt = (task as any).remindAt ?? null;
  const previousScheduleDate = (task as any).scheduleDate ?? null;
  const repeat = parseRecurrence(schedule.recurrence);
  if (
    repeat &&
    !isNewRepeat &&
    remindAt &&
    previousRemindAt === remindAt &&
    scheduleDate !== previousScheduleDate
  ) {
    const day = scheduleDate ? new Date(scheduleDate) : schedule.dueDate ? new Date(schedule.dueDate) : null;
    if (day) remindAt = rollForwardReminder(previousRemindAt, day);
  }

  await db.orm.public.Task.where({ id }).update({
    dueDate: schedule.dueDate,
    scheduleDate,
    remindAt,
    recurrence: schedule.recurrence,
    recurrenceEnd: schedule.recurrenceEnd,
  });
  await emitTasks(db, userId, id);
}

/** G107：官方 setter 收 `blockIds[]` 批量；计划与截止各有一条批量入口。 */
export async function setTasksSchedule(ids: string[], schedule: TaskSchedule) {
  for (const id of ids) await setTaskSchedule(id, schedule);
}

/** G107：截止是独立维度 —— 批量只写 `dueDate`，不会顺手改计划/提醒。 */
export async function setTasksDeadline(ids: string[], dueDate: string | null) {
  const userId = await requireUserId();
  const db = await getDb();
  const now = new Date().toISOString();
  for (const id of ids) {
    const task = await db.orm.public.Task.first({ id });
    if (!task || (task as any).userId !== userId) throw new Error('未授权');
    await db.orm.public.Task.where({ id }).update({ dueDate, updatedAt: now });
    await emitTasks(db, userId, id);
  }
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

/** G727（`⏎` 编辑）：行与正文里的 `taskItem` 节点同名改写，正文存在时才走文档那一路。 */
export async function renameTask(id: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');
  const nextTitle = title.trim();
  if (!nextTitle) throw new Error('标题不能为空');

  const db = await getDb();
  const task = await db.orm.public.Task.first({ id });
  if (!task || (task as any).userId !== session.user.id) throw new Error('未授权');

  await db.orm.public.Task.where({ id }).update({
    title: nextTitle,
    updatedAt: new Date().toISOString(),
  });
  if (task.documentId && task.blockId) {
    const document = await db.orm.public.Document.first({ id: task.documentId });
    if (document && (document as any).content) {
      const content = renameTaskNode((document as any).content, task.blockId, nextTitle);
      if (content !== (document as any).content) {
        await db.orm.public.Document.where({ id: task.documentId }).update({ content });
      }
    }
  }
  await emitTasks(db, session.user.id, id);
}

/** G727（视图级撤销）：删除的逆操作＝清墓碑，行本身从未被物理移除。 */
export async function restoreTask(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const task = await db.orm.public.Task.first({ id });
  if (!task || (task as any).userId !== session.user.id) throw new Error('未授权');

  await db.orm.public.Task.where({ id }).update({
    deletedAt: null,
    updatedAt: new Date().toISOString(),
  });
  await emitTasks(db, session.user.id, id);
}

/**
 * G604: relative-position reordering — "put this task after that one", not "put it at index N".
 * An index is stale the moment a concurrent write lands; a relative anchor is not. The anchor's
 * own order is read, the moved task takes a value just after it, and the rest are renumbered.
 */
export async function reorderTasks(blockId: string, afterBlockId: string | null): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const rows = await db.orm.public.Task
    .where({ userId: session.user.id, deletedAt: null })
    .orderBy((t: any) => t.order.asc())
    .all();
  const ids = rows.map((row: any) => String(row.id));
  if (!ids.includes(blockId)) throw new Error('任务不存在');

  const next = reorderAfter(ids, blockId, afterBlockId);
  // Nothing moved (unknown anchor / already in place) ⇒ no write.
  if (next.join(',') === ids.join(',')) return;

  const now = new Date().toISOString();
  for (let index = 0; index < next.length; index += 1) {
    const id = next[index];
    const current = rows.find((row: any) => String(row.id) === id) as any;
    if (current && Number(current.order) === index) continue;
    await db.orm.public.Task.where({ id }).update({ order: index, updatedAt: now });
  }
  await emitTasks(db, session.user.id, blockId);
}

/**
 * G260: the series batch operations. "Remaining" = the not-yet-done, not-yet-cancelled occurrences
 * of the same series that come after this one. Each op touches only those rows.
 */
export async function applySeriesOp(
  taskId: string,
  op: 'complete' | 'cancel' | 'delete' | 'move' | 'reschedule',
  payload?: { moveToSeriesId?: string; rescheduleDays?: number },
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const from = await db.orm.public.Task.first({ id: taskId });
  if (!from || (from as any).userId !== session.user.id) throw new Error('任务不存在');

  const seriesId = (from as any).seriesId ?? taskId;
  const rows = await db.orm.public.Task
    .where({ userId: session.user.id, seriesId, deletedAt: null })
    .all();
  const remaining = rows.filter((row: any) => String(row.id) !== taskId && !row.isCompleted && row.status !== 'cancelled');

  const now = new Date().toISOString();
  for (const row of remaining) {
    const r = row as any;
    if (op === 'complete') {
      await db.orm.public.Task.where({ id: r.id }).update({ isCompleted: true, status: 'done', completedAt: now, updatedAt: now });
    } else if (op === 'cancel') {
      await db.orm.public.Task.where({ id: r.id }).update({ isCompleted: false, status: 'cancelled', cancelledAt: now, updatedAt: now });
    } else if (op === 'delete') {
      await db.orm.public.Task.where({ id: r.id }).update({ deletedAt: now, updatedAt: now });
    } else if (op === 'move') {
      const target = payload?.moveToSeriesId ?? null;
      if (target) await db.orm.public.Task.where({ id: r.id }).update({ seriesId: target, updatedAt: now });
    } else if (op === 'reschedule') {
      const days = payload?.rescheduleDays ?? 0;
      if (days && r.dueDate) {
        const next = new Date(new Date(r.dueDate).getTime() + days * 86_400_000).toISOString();
        await db.orm.public.Task.where({ id: r.id }).update({ dueDate: next, updatedAt: now });
      }
    }
  }
  await emitTasks(db, session.user.id, taskId);
}

/**
 * G408: the subtask relation is **derived server-side**, not stored as a parent pointer. The
 * official endpoint returns `{subTasks: [{rootTaskBlockId, subTaskBlocks[]}]}` and the client builds
 * a Map. Locally the document's block tree carries the nesting, so the groups are read from the
 * task rows' document order + depth (a task whose block is nested under another task's block).
 */

/**
 * G408: the subtask relation is **derived server-side**, not stored as a parent pointer. The
 * official endpoint returns `{subTasks: [{rootTaskBlockId, subTaskBlocks[]}]}` and the client builds
 * a Map. Locally the nesting lives in the document's block tree, so each task's depth is read from
 * the document content (the task item's nesting level) and the groups are derived from order+depth.
 */
export async function getSubTasks(): Promise<{ subTasks: { rootTaskBlockId: string; subTaskBlocks: string[] }[] }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const tasks = await db.orm.public.Task
    .where({ userId: session.user.id, deletedAt: null })
    .all();

  const subTasks: { rootTaskBlockId: string; subTaskBlocks: string[] }[] = [];
  const byDoc = new Map<string, Record<string, unknown>[]>();
  for (const task of tasks as Record<string, unknown>[]) {
    const documentId = typeof task.documentId === 'string' ? task.documentId : '';
    if (!documentId) continue;
    const list = byDoc.get(documentId) ?? [];
    list.push(task);
    byDoc.set(documentId, list);
  }

  for (const [documentId, rows] of byDoc) {
    const doc = await db.orm.public.Document.first({ id: documentId });
    const content = (doc as { content?: unknown } | null)?.content;
    const depths = taskDepthsFromContent(content);
    const ordered = rows
      .map((row) => ({
        blockId: String(row.blockId ?? ''),
        documentId,
        indent: depths.get(String(row.blockId ?? '')) ?? 0,
      }))
      .filter((row) => row.blockId)
      .sort((a, b) => (depths.get(a.blockId) ?? 0) - (depths.get(b.blockId) ?? 0) || a.blockId.localeCompare(b.blockId));
    subTasks.push(...deriveSubtasks(ordered));
  }
  return { subTasks };
}

/** Each task item's nesting depth in the document, keyed by its `blockId`. */
function taskDepthsFromContent(content: unknown): Map<string, number> {
  const out = new Map<string, number>();
  const walk = (node: any, depth: number) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'taskItem' && typeof node.attrs?.blockId === 'string') {
      out.set(node.attrs.blockId, depth);
    }
    if (Array.isArray(node.content)) {
      const next = node.type === 'taskList' || node.type === 'taskItem' ? depth + 1 : depth;
      for (const child of node.content) walk(child, next);
    }
  };
  walk(content, 0);
  return out;
}
