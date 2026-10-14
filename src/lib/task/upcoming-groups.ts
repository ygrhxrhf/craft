import type { TaskItem } from '@/actions/task/task';
import { UPCOMING_THIS_MONTH, UPCOMING_THIS_WEEK } from './official-copy';

/**
 * 「即将进行」的分组与排序，逐字移植官方 `TasksBrowseUpcomingView.utils-CXbjE4oj.js`
 * （`T` / `S` / `W` / `C` 四个符号，别名解自 `index-DiTmKH3z.js` 的导出表）。四条不那么显然的规则：
 *
 * 1. 排期落在**本周**（周首…周日 23:59:59.999，两端闭区间 `r7`）内的归为一节；节头日期不是今天，
 *    而是官方的 `D()` ＝ **明天**——即将进行窗口从今天之外开始，今天属于「今天」那一栏。
 * 2. 更晚的按月并节（`month`，节头＝该月一号与**下周一**里较晚的那个），跨年（年份大于今年）按年并节
 *    （`year`，节头＝该年一月一号，同样不早于下周一）。
 * 3. **没有排期的块整个跳过**（`if (schedule == null) continue`）：官方这一栏只列排期过的任务。
 * 4. 节之间 `S`：日期完全相同比 `T` 档序（week<month<year）；与 `D()` 同日的节钉在最前；其余按日期升序。
 *    节内 `W`：无排期在前，其次排期升序，两者都相同再按创建时间升序。
 *
 * 官方 `b(s, tz)` 按用户的周首设置算周起点（`gLe` 从时区/地区解析），本地只有周一起点这一种约定，
 * 与日历侧 `spanOf('week')` 保持一致；官方 `I`/`M`（月首/年首）保留排期上的时分，本地按天归零，
 * 因为节头只取月/年，时刻只会让同月的两枚任务裂成两节。
 */

/** 官方的 `T = {week:0, month:1, year:2}`。 */
export const UPCOMING_KIND_RANK = { week: 0, month: 1, year: 2 } as const;
export type UpcomingKind = keyof typeof UPCOMING_KIND_RANK;

export type UpcomingGroup = {
  kind: UpcomingKind;
  /** `week` 一节是明天（官方 `D()`），其余是该月/该年一号与下周一里较晚的那个。 */
  date: Date;
  tasks: TaskItem[];
};

/** `W` 的输入形状：官方读 `taskData.schedule` 与 `createdMs`。 */
export type ScheduledLike = { schedule: Date | null; createdMs?: number | null };
/** `S` 的输入形状。 */
export type GroupLike = { kind: UpcomingKind; date: Date };

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/** 官方的 `D()` ＝ `B1(Qo(),1)`：明天零点。 */
export function upcomingStartDay(now: Date): Date {
  const tomorrow = startOfDay(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 一周从周一起。`end` 是那最后一天的**日终**，官方 `O` 的闭区间右端点。 */
export function weekWindow(now: Date): { start: Date; end: Date; next: Date } {
  const today = startOfDay(now);
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const next = new Date(end);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return { start, end, next };
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function startOfYear(value: Date): Date {
  return new Date(value.getFullYear(), 0, 1);
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** 官方的 `S`：节与节之间。`now` 只用来现算 `D()`。 */
export function compareGroups(a: GroupLike, b: GroupLike, now: Date): number {
  if (a.date.getTime() === b.date.getTime()) {
    return UPCOMING_KIND_RANK[a.kind] - UPCOMING_KIND_RANK[b.kind];
  }
  const start = upcomingStartDay(now);
  if (sameDay(a.date, start)) return -1;
  if (sameDay(b.date, start)) return 1;
  return a.date.getTime() - b.date.getTime();
}

/** 官方的 `W`：节内。无排期排在**最前**而不是最后，两枚都无排期时退到比创建时间。 */
export function compareScheduled(a: ScheduledLike, b: ScheduledLike): number {
  const schedule = a.schedule ?? null;
  const other = b.schedule ?? null;
  if (schedule == null && other == null) return 0;
  if (schedule == null) return -1;
  if (other == null) return 1;
  if (schedule.getTime() === other.getTime()) {
    return (a.createdMs ?? 0) - (b.createdMs ?? 0);
  }
  return schedule.getTime() - other.getTime();
}

function toSchedule(task: TaskItem): Date | null {
  if (!task.dueDate) return null;
  const date = new Date(task.dueDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toCreatedMs(task: TaskItem): number {
  if (!task.createdAt) return 0;
  const created = new Date(task.createdAt);
  return Number.isNaN(created.getTime()) ? 0 : created.getTime();
}

/** 官方的 `C(blocks, timezone)`。 */
export function upcomingGroups(tasks: readonly TaskItem[], now: Date = new Date()): UpcomingGroup[] {
  const week = weekWindow(now);
  const groups = new Map<string, UpcomingGroup>();

  for (const task of tasks) {
    const schedule = toSchedule(task);
    if (schedule == null) continue;

    let kind: UpcomingKind;
    let date: number;
    if (schedule >= week.start && schedule <= week.end) {
      kind = 'week';
      date = upcomingStartDay(now).getTime();
    } else if (schedule.getFullYear() > now.getFullYear()) {
      kind = 'year';
      date = Math.max(startOfYear(schedule).getTime(), week.next.getTime());
    } else {
      kind = 'month';
      date = Math.max(startOfMonth(schedule).getTime(), week.next.getTime());
    }

    const key = `${kind}:${date}`;
    const group = groups.get(key);
    if (group) group.tasks.push(task);
    else groups.set(key, { kind, date: new Date(date), tasks: [task] });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      tasks: [...group.tasks].sort((a, b) =>
        compareScheduled(
          { schedule: toSchedule(a), createdMs: toCreatedMs(a) },
          { schedule: toSchedule(b), createdMs: toCreatedMs(b) }
        )
      ),
    }))
    .sort((a, b) => compareGroups(a, b, now));
}

/**
 * 节头文案（官方 `H1` 里的 `T`）：`week` 用 `date.this.week`，`year` 用纯年份数字，
 * `month` 在本月时用 `date.this.month`、否则用长月名。官方还套了一层首字母大写
 * （拉丁文用），中文下是恒等变换，故本地不复刻。
 */
export function upcomingGroupTitle(
  group: GroupLike,
  now: Date = new Date(),
  locale = 'zh-CN'
): string {
  if (group.kind === 'week') return UPCOMING_THIS_WEEK;
  if (group.kind === 'year') {
    return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(group.date);
  }
  if (sameMonth(group.date, now)) return UPCOMING_THIS_MONTH;
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(group.date);
}

/** 官方 `H1` 的 `w` ＝ `${kind}:${date.getTime()}`，同时是 `jt` 的 `id`。 */
export type UpcomingSection = {
  key: string;
  title: string;
  /** 节头副标题：官方 `subtitle={f.length}` ＝**未完成数**，与开关无关。 */
  undone: number;
  blocks: TaskItem[];
};

/**
 * 官方 `H1` 的两条展示规则：`b = showCompleted ? n : f`（关掉开关就只留未完成），
 * 且 `b.length === 0` 时整节 `{isVisible:false}`（空节不占位）。
 * `hasScheduled` 让调用方分清「这一栏根本没有排期过的任务」与「有，但都做完了」。
 */
export function upcomingSections(
  tasks: readonly TaskItem[],
  showCompleted: boolean,
  now: Date = new Date()
): { sections: UpcomingSection[]; hasScheduled: boolean } {
  const groups = upcomingGroups(tasks, now);
  return {
    sections: groups
      .map((group) => {
        // 官方三档里"还活着"的只有 pending：完成与取消都不该在未办计数里，也不该在开关关闭时被显示。
        const undone = group.tasks.filter((task) => !task.isCompleted && task.status !== 'cancelled');
        return {
          key: `${group.kind}:${group.date.getTime()}`,
          title: upcomingGroupTitle(group, now),
          undone: undone.length,
          blocks: showCompleted ? group.tasks : undone,
        };
      })
      .filter((section) => section.blocks.length > 0),
    hasScheduled: groups.length > 0,
  };
}
