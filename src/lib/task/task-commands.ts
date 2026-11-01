/**
 * G253 —— `schedule` 与 `deadline` 是**两套平行 setter，但不对称**（`tasks.md`）。
 *
 * 两组命令 id 在 `official-catalog.ts:820-882` 都在，且官方不对称本身已记录：
 * `schedule` 多一条 `commands.task.schedule.x`「安排到 [0]」（动态日期短语），**deadline 没有 .x**。
 *
 * 本地字段语义**已分离**（`scheduleDate` / `dueDate` 两列各自读写），真缺口是**命令面全空**——
 * 两组 id 都未接入命令注册表。本模块把两组命令的**结构**（含那处不对称）写出来，供注册表消费。
 */

export type TaskDateCommandField = 'schedule' | 'deadline';

export interface TaskDateCommand {
  id: string;
  field: TaskDateCommandField;
  label: string;
  /** 动态日期短语（只有 schedule 有）。 */
  dynamic?: boolean;
}

/**
 * 两组命令。结构逐字来自 `official-catalog.ts:820-882`：`<field>` 本体 + `.clear` + `.date` +
 * 若干固定短语；`schedule` 另有一条 `.x` 动态短语，`deadline` 没有——这正是官方的不对称。
 */
export const TASK_DATE_COMMANDS: readonly TaskDateCommand[] = [
  // deadline 组（无 .x）
  { id: 'commands.task.deadline', field: 'deadline', label: '截止日期' },
  { id: 'commands.task.deadline.clear', field: 'deadline', label: '清除截止日期' },
  { id: 'commands.task.deadline.date', field: 'deadline', label: '选择日期…' },
  { id: 'commands.task.deadline.for.tomorrow', field: 'deadline', label: '截止到明天' },
  { id: 'commands.task.deadline.next.monday', field: 'deadline', label: '截止到下周一' },
  { id: 'commands.task.deadline.today', field: 'deadline', label: '截止到今天' },
  // schedule 组（多一条 .x 动态短语）
  { id: 'commands.task.schedule', field: 'schedule', label: '计划日期' },
  { id: 'commands.task.schedule.clear', field: 'schedule', label: '清除计划日期' },
  { id: 'commands.task.schedule.date', field: 'schedule', label: '选择日期…' },
  { id: 'commands.task.schedule.for.today', field: 'schedule', label: '计划到今天' },
  { id: 'commands.task.schedule.x', field: 'schedule', label: '安排到 [0]', dynamic: true },
] as const;

/** 某一组里是否有动态短语命令（`schedule` 有、`deadline` 没有）。 */
export function hasDynamicCommand(field: TaskDateCommandField): boolean {
  return TASK_DATE_COMMANDS.some((command) => command.field === field && command.dynamic);
}

/** 某一组的全部命令。 */
export function commandsForField(field: TaskDateCommandField): TaskDateCommand[] {
  return TASK_DATE_COMMANDS.filter((command) => command.field === field);
}

/**
 * 两组命令的**不对称**：`schedule` 有动态短语、`deadline` 没有。判据本身可断言，
 * 好让"某天有人顺手给 deadline 也加一条 .x"变红。
 */
export function isAsymmetric(): boolean {
  return hasDynamicCommand('schedule') && !hasDynamicCommand('deadline');
}
