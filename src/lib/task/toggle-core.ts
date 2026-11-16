/**
 * 勾选完成态的纯核：服务端 `toggleTask` 与客户端离线写都读这一份。
 *
 * 为什么必须只有一份：勾选带两条派生——三档状态机（`task-status.ts`）与重复任务的下一期
 * 行（`nextOccurrence` + `rollForwardReminder`）。服务端那份此前写在 action 里，客户端离线时
 * 够不着；若客户端另抄一遍，两条通路迟早会在 `flexible`／提醒重算这些边角上分叉。
 * 所以抽出来：action 与 `applyLocal` 都调 `planToggle`，只是落库载体不同。
 *
 * 不在这里做的一件事：正文 `taskItem` 的勾选态回写。它要读 `Document.content`（服务端镜像），
 * 客户端离线时没有等价通路，仍留在服务端 action（`syncTaskToDocument`）里。
 */
import { applyToggled, type TaskAttrs } from '@/lib/editor/task-status';
import { nextOccurrence, parseRecurrence } from './recurrence';
import { rollForwardReminder } from './repeat-reminder';

export type TaskLineStatusValue = 'todo' | 'done' | 'cancelled';

/** 勾选判定的输入。字段与服务端 action 从 `Task` 行取的那几列同形。 */
export interface ToggleSource {
  id: string;
  userId: string;
  title: string;
  isCompleted: boolean;
  status?: string | null;
  cancelledAt?: string | null;
  documentId?: string | null;
  blockId?: string | null;
  dueDate?: string | null;
  remindAt?: string | null;
  recurrence?: string | null;
  recurrenceEnd?: string | null;
  seriesId?: string | null;
  order?: number | null;
}

/** 勾选这一次要落的四列（`Task.updatedAt` 由调用方补：它是同步时间戳，不属于状态机）。 */
export interface ToggleColumns {
  isCompleted: boolean;
  status: TaskLineStatusValue;
  completedAt: string | null;
  cancelledAt: string | null;
}

/** 重复任务派生出的下一期行（离线新建要带全铸造列，故是完整一行而非增量 patch）。 */
export interface RollForwardRow {
  id: string;
  userId: string;
  title: string;
  documentId: string | null;
  blockId: string | null;
  isCompleted: false;
  status: 'todo';
  dueDate: string;
  remindAt: string | null;
  recurrence: string;
  recurrenceEnd: string | null;
  seriesId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 三档的那一次点击＝`tasks.md:12` 的三值循环（未勾 → 勾 → 未勾；已取消 → 未勾）。
 * 判定只在 `task-status.ts` 里写一遍，这里只把结果投影成列。
 */
export function toggleColumns(
  source: Pick<ToggleSource, 'isCompleted' | 'status' | 'cancelledAt'>,
  now: Date,
): ToggleColumns {
  const current: TaskAttrs = {
    checked: source.isCompleted,
    cancelled: source.status === 'cancelled',
    cancelledAt: source.cancelledAt ?? null,
  };
  const next = applyToggled(current);
  return {
    isCompleted: next.checked,
    status: next.cancelled ? 'cancelled' : next.checked ? 'done' : 'todo',
    completedAt: next.checked ? now.toISOString() : null,
    cancelledAt: next.cancelledAt,
  };
}

/**
 * 完成一条重复任务 → 下一期那一行。规则原样照搬服务端 `rollForward`：
 *
 * - `flexible` 从**完成的这一刻**起算，`fixed`（含没有 `type` 的旧规则）从原排期起算；
 * - 起算日取 `dueDate ?? remindAt`——**计划轴（`scheduleDate`）不参与**。这是服务端现行口径，
 *   本批只把同一口径搬到客户端，不在这里单独改语义（那是另一条账）。
 * - 提醒按「新排期那天 ＋ 原提醒的当日分钟数」现算；已过去的提醒静默丢掉。
 * - 下一期沿用原行 `seriesId`（没有就自成序列，用原行 id），文档/区块深链一并带上。
 */
export function rollForwardRow(
  source: ToggleSource,
  now: Date,
  timeZone: string,
  nextId: string,
): RollForwardRow | null {
  const rule = parseRecurrence(source.recurrence);
  if (!rule) return null;

  const base = source.dueDate ?? source.remindAt;
  const from = rule.type === 'flexible' ? now : base ? new Date(base) : now;
  const upcoming = nextOccurrence(source.recurrence, from, timeZone);
  if (!upcoming) return null;

  const remindAt = rollForwardReminder(source.remindAt, upcoming, timeZone, now);
  const stamp = now.toISOString();
  return {
    id: nextId,
    userId: source.userId,
    title: source.title,
    documentId: source.documentId ?? null,
    blockId: source.blockId ?? null,
    isCompleted: false,
    status: 'todo',
    dueDate: upcoming.toISOString(),
    remindAt,
    recurrence: source.recurrence!,
    recurrenceEnd: source.recurrenceEnd ?? null,
    seriesId: source.seriesId ?? source.id,
    order: typeof source.order === 'number' ? source.order : 0,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export interface TogglePlan {
  columns: ToggleColumns;
  /** 只有「变成完成」且规则可解析时才派下一期；取消勾选/已取消那一档都不派生。 */
  next: RollForwardRow | null;
}

/**
 * 一次勾选的完整计划。`nextId` 由调用方给：服务端 action 与客户端离线写都用
 * `crypto.randomUUID()`，于是**推送重试不会派生第二行**（同一枚 id 的 upsert 幂等）。
 */
export function planToggle(
  source: ToggleSource,
  now: Date,
  timeZone: string,
  nextId: string,
): TogglePlan {
  const columns = toggleColumns(source, now);
  const next = columns.isCompleted ? rollForwardRow(source, now, timeZone, nextId) : null;
  return { columns, next };
}
