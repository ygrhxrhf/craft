/**
 * G604: the official tasks screen keeps one settings object per device (`Tn` in
 * `TaskViews-CxB6Qe1s.js`), persisted under `taskViewSettings` and read through a per-key hook (`Mi`).
 * Every key has a validator (`Qs`), objects missing keys fold onto the defaults, and a version bump
 * (`Pa`) resets exactly the two fields whose meaning changed. That whole layer is reproduced here
 * verbatim — the 10 defaults, the 10 validators, the all-keys gate, and the migration.
 *
 * The values are what the official screen's menus *do*, so the sort/filter derivations sit next to
 * them: 「显示计划任务」 off hides scheduled inbox rows, 「显示过去日期」 pulls overdue into 今天,
 * and reordering is only allowed while the task sort is 手动的.
 */

export type InboxTaskSort = 'schedule' | 'deadline' | 'manual';
export type TaskSort = 'schedule' | 'deadline';
export type DocumentSort = 'created' | 'modified' | 'title';
export type UpcomingGroupBy = 'schedule' | 'deadline' | 'document';

export interface TaskViewSettings {
  inboxShowScheduledTasks: boolean;
  inboxTaskSort: InboxTaskSort;
  todayShowPastDueTasks: boolean;
  todaySortAscending: boolean;
  todaySortProperty: DocumentSort;
  todayTaskSort: TaskSort;
  upcomingGroupBy: UpcomingGroupBy;
  upcomingDocumentSort: DocumentSort;
  upcomingTaskSort: TaskSort;
  defaultsVersion: number;
}

/** `Tn` verbatim: `{inboxShowScheduledTasks:!0, inboxTaskSort:"schedule", … defaultsVersion:1}`. */
export const TASK_VIEW_SETTINGS_DEFAULTS_VERSION = 1;

export const DEFAULT_TASK_VIEW_SETTINGS: TaskViewSettings = {
  inboxShowScheduledTasks: true,
  inboxTaskSort: 'schedule',
  todayShowPastDueTasks: true,
  todaySortAscending: true,
  todaySortProperty: 'modified',
  todayTaskSort: 'schedule',
  upcomingGroupBy: 'schedule',
  upcomingDocumentSort: 'modified',
  upcomingTaskSort: 'schedule',
  defaultsVersion: TASK_VIEW_SETTINGS_DEFAULTS_VERSION,
};

/** `_a = "taskViewSettings"` — the official storage key, kept verbatim so the shape matches. */
export const TASK_VIEW_SETTINGS_STORAGE_KEY = 'taskViewSettings';

type Validator = (value: unknown) => boolean;

const isBoolean: Validator = (value) => typeof value === 'boolean';

const oneOf =
  <T extends string>(...allowed: readonly T[]): Validator =>
  (value) =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value);

/**
 * `Qs` verbatim. Two shapes matter: `inboxTaskSort` is the **only** task sort that offers 手动的
 * (`La = [...Js, "manual"]`), and 今天/即将进行 sort tasks only by 安排/截止日期 (`Js`), so a stored
 * `manual` there is not a valid setting — it falls back to the default instead.
 */
export const TASK_VIEW_SETTING_VALIDATORS = {
  inboxShowScheduledTasks: isBoolean,
  inboxTaskSort: oneOf<InboxTaskSort>('schedule', 'deadline', 'manual'),
  todayShowPastDueTasks: isBoolean,
  todaySortAscending: isBoolean,
  todaySortProperty: oneOf<DocumentSort>('created', 'modified', 'title'),
  todayTaskSort: oneOf<TaskSort>('schedule', 'deadline'),
  upcomingGroupBy: oneOf<UpcomingGroupBy>('schedule', 'deadline', 'document'),
  upcomingDocumentSort: oneOf<DocumentSort>('created', 'modified', 'title'),
  upcomingTaskSort: oneOf<TaskSort>('schedule', 'deadline'),
  defaultsVersion: (value) => value === TASK_VIEW_SETTINGS_DEFAULTS_VERSION,
} as const satisfies Record<keyof TaskViewSettings, Validator>;

/** `Ei = Object.keys(Qs)` — the migration walks exactly these. */
export const TASK_VIEW_SETTING_KEYS = Object.keys(
  TASK_VIEW_SETTING_VALIDATORS,
) as (keyof TaskViewSettings)[];

/** `va`: every key must pass its own validator — one bad field invalidates the whole object. */
export function isValidTaskViewSettings(value: unknown): value is TaskViewSettings {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return TASK_VIEW_SETTING_KEYS.every((key) => TASK_VIEW_SETTING_VALIDATORS[key](record[key]));
}

/**
 * `Pa` verbatim, including the version bump: an older `defaultsVersion` forfeits two fields —
 * `inboxShowScheduledTasks: false` and `todaySortProperty: "created"` both go back to the default,
 * because their meaning changed rather than their value.
 */
export function migrateTaskViewSettings(value: unknown): TaskViewSettings {
  if (typeof value !== 'object' || value === null) return DEFAULT_TASK_VIEW_SETTINGS;
  const source = value as Record<string, unknown>;
  const merged: TaskViewSettings = { ...DEFAULT_TASK_VIEW_SETTINGS };
  for (const key of TASK_VIEW_SETTING_KEYS) {
    const candidate = source[key];
    if (TASK_VIEW_SETTING_VALIDATORS[key](candidate)) {
      (merged as unknown as Record<string, unknown>)[key] = candidate;
    }
  }
  if (source.defaultsVersion !== TASK_VIEW_SETTINGS_DEFAULTS_VERSION) {
    if (source.inboxShowScheduledTasks === false) {
      merged.inboxShowScheduledTasks = DEFAULT_TASK_VIEW_SETTINGS.inboxShowScheduledTasks;
    }
    if (source.todaySortProperty === 'created') {
      merged.todaySortProperty = DEFAULT_TASK_VIEW_SETTINGS.todaySortProperty;
    }
  }
  return merged;
}

const listeners = new Set<() => void>();

// `useSyncExternalStore` compares snapshots by identity, so a fresh parse on every render would
// re-render forever. Cache the parsed object against the raw string it came from.
let cachedRaw: string | null = null;
let cachedSettings: TaskViewSettings = DEFAULT_TASK_VIEW_SETTINGS;

export function readTaskViewSettings(): TaskViewSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_TASK_VIEW_SETTINGS;
  let raw: string | null;
  try {
    raw = localStorage.getItem(TASK_VIEW_SETTINGS_STORAGE_KEY);
  } catch {
    return DEFAULT_TASK_VIEW_SETTINGS;
  }
  if (raw === cachedRaw) return cachedSettings;
  cachedRaw = raw;
  if (raw === null) {
    cachedSettings = DEFAULT_TASK_VIEW_SETTINGS;
    return cachedSettings;
  }
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  cachedSettings = migrateTaskViewSettings(parsed);
  return cachedSettings;
}

/**
 * `ds` verbatim: the patch is spread over whatever is stored *now* (not over the render-time
 * snapshot), so two menus writing different keys cannot clobber each other.
 */
export function writeTaskViewSettings(patch: Partial<TaskViewSettings>): void {
  if (typeof localStorage === 'undefined') return;
  const next: TaskViewSettings = { ...readTaskViewSettings(), ...patch };
  try {
    localStorage.setItem(TASK_VIEW_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return;
  }
  cachedRaw = '';
  listeners.forEach((listener) => listener());
}

/** `Mi(key)`: the one-key setter a menu row calls. */
export function writeTaskViewSetting<K extends keyof TaskViewSettings>(
  key: K,
  value: TaskViewSettings[K],
): void {
  writeTaskViewSettings({ [key]: value } as Pick<TaskViewSettings, K>);
}

export function subscribeTaskViewSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** SSR snapshot — defaults, so the server HTML matches a first visit. */
export function serverTaskViewSettings(): TaskViewSettings {
  return DEFAULT_TASK_VIEW_SETTINGS;
}

/** Test seam: drop the cache so the next read re-parses storage. */
export function resetTaskViewSettingsCache(): void {
  cachedRaw = null;
  cachedSettings = DEFAULT_TASK_VIEW_SETTINGS;
}

export interface SortableTask {
  id: string;
  title?: string;
  scheduleDate: string | null;
  dueDate: string | null;
  order?: number | null;
  createdAt?: string | null;
}

const timeOf = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

/** Ascending with empty values last, ties broken by id so pages sort the same everywhere. */
function ascendingNullsLast(
  pick: (task: SortableTask) => string | null | undefined,
): (a: SortableTask, b: SortableTask) => number {
  return (a, b) => {
    const left = timeOf(pick(a));
    const right = timeOf(pick(b));
    if (left === right) return a.id.localeCompare(b.id);
    if (left === null) return 1;
    if (right === null) return -1;
    return left - right;
  };
}

const SORT_COMPARATORS: Record<InboxTaskSort, (a: SortableTask, b: SortableTask) => number> = {
  schedule: ascendingNullsLast((task) => task.scheduleDate),
  deadline: ascendingNullsLast((task) => task.dueDate),
  // `reorderTasks` renumbers `order` from 0 on every drop, so this is the same sequence the
  // official manual sort shows. Rows never dragged have no order and compare equal, which keeps
  // the server's page order among them (Array#sort is stable).
  manual: (a, b) => (a.order ?? 0) - (b.order ?? 0),
};

export function sortTasksForView<T extends SortableTask>(
  tasks: readonly T[],
  sort: InboxTaskSort,
): T[] {
  return [...tasks].sort(SORT_COMPARATORS[sort]);
}

/**
 * 「显示计划任务」(`tasks.show.scheduled.tasks`): off keeps only rows with no schedule at all
 * (`Wa`: `c.filter(a => a.taskData?.schedule == null)`), which is what makes the inbox read as a
 * pure triage list.
 */
export function filterInboxScheduled<T extends { scheduleDate: string | null }>(
  tasks: readonly T[],
  showScheduledTasks: boolean,
): T[] {
  return showScheduledTasks ? [...tasks] : tasks.filter((task) => task.scheduleDate === null);
}

const startOfDay = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

/**
 * 「显示过去日期」(`tasks.show.past.dates`). The official today view filters on
 * `taskData.schedule ?? taskData.deadline` and switches between two predicates:
 *
 * - on:  earlier than **tomorrow** — i.e. overdue rows join today's list (`Od(Nt(now, 1))`)
 * - off: the same day as now (`Ad(now)`)
 */
export function matchesTodayView(
  task: Pick<SortableTask, 'scheduleDate' | 'dueDate'>,
  showPastDueTasks: boolean,
  now: Date = new Date(),
): boolean {
  const effective = timeOf(task.scheduleDate) ?? timeOf(task.dueDate);
  if (effective === null) return false;
  const start = startOfDay(now).getTime();
  if (showPastDueTasks) {
    // `Xs(l, Nt(now, 1))` — earlier than tomorrow, with no lower bound: that is what makes
    // everything overdue join the list.
    const tomorrow = new Date(start);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return effective < tomorrow.getTime();
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return effective >= start && effective < end.getTime();
}

export interface TaskViewFilterState {
  excludeDailyNotes: boolean;
  excludePinned: boolean;
}

export const DEFAULT_TASK_VIEW_FILTERS: TaskViewFilterState = {
  excludeDailyNotes: false,
  excludePinned: false,
};

/**
 * The filter menu's two document-level rows. `rightContent: excludeX ? undefined : checkIcon`
 * means the ✓ marks rows that are **included**, so the flags here are the negation of the label.
 */
export function applyTaskViewFilters<
  T extends { documentId: string | null; isDailyNote?: boolean | null },
>(
  tasks: readonly T[],
  filters: TaskViewFilterState,
  pinnedDocumentIds: ReadonlySet<string> = new Set(),
): T[] {
  return tasks.filter((task) => {
    if (filters.excludeDailyNotes && task.isDailyNote) return false;
    if (filters.excludePinned && task.documentId && pinnedDocumentIds.has(task.documentId)) {
      return false;
    }
    return true;
  });
}

/**
 * `Ki`: reordering is refused while the list is sorted by a date. The inbox offers a way out
 * (switch to 手动的), 今天/即将进行 do not — they have no manual option at all.
 */
export function canReorderTasks(sort: InboxTaskSort): boolean {
  return sort === 'manual';
}
