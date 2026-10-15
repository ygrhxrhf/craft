/**
 * The tasks screen's default view (G262). `tasks.set.as.default.view`「设置为默认视图」 makes the
 * chosen view stick, so opening the tasks screen lands on it rather than on the inbox.
 *
 * The official build keeps this as a persisted preference, which is why the ledger parks it as a
 * forbidden-to-touch area during collection. Locally it is device-scoped storage, the same shape the
 * browse layout uses (`view-modes.ts`) — the axis is the same, the reach is deliberately narrower.
 */

export const TASK_GROUPS = ['inbox', 'today', 'upcoming', 'all'] as const;
export type TaskGroupId = (typeof TASK_GROUPS)[number];

/** The screen's landing view when nothing has been chosen. */
export const DEFAULT_TASK_GROUP: TaskGroupId = 'inbox';

export const SET_AS_DEFAULT_VIEW = '设置为默认视图';
export const SET_AS_DEFAULT_VIEW_KEY = 'tasks.set.as.default.view';

const STORAGE_KEY = 'craft.tasks.defaultGroup';

export function isTaskGroupId(value: unknown): value is TaskGroupId {
  return typeof value === 'string' && (TASK_GROUPS as readonly string[]).includes(value);
}

/** Fold an unknown stored value onto the default rather than routing somewhere that may not exist. */
export function resolveTaskGroup(value: unknown): TaskGroupId {
  return isTaskGroupId(value) ? value : DEFAULT_TASK_GROUP;
}

/** The stored default view, or the built-in one. Never throws when storage is unavailable. */
export function readDefaultTaskGroup(): TaskGroupId {
  if (typeof localStorage === 'undefined') return DEFAULT_TASK_GROUP;
  try {
    return resolveTaskGroup(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_TASK_GROUP;
  }
}

export function storeDefaultTaskGroup(group: TaskGroupId): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, group);
  } catch {
    // 存储不可用（隐私模式／配额）时静默：默认视图是便利项，不该让设置动作失败。
  }
}

/**
 * Where `/tasks` should send a reader, or `null` when it is already the right place.
 *
 * `/tasks` is the inbox route, so only a *different* stored default needs a redirect — returning
 * the current group would make the screen redirect to itself on every load.
 */
export function defaultViewRedirect(
  current: TaskGroupId,
  stored: TaskGroupId = readDefaultTaskGroup(),
): TaskGroupId | null {
  return stored === current ? null : stored;
}

/** The href for a group. `/tasks` is the inbox path; the rest are their own segments. */
export function taskGroupHref(group: TaskGroupId): string {
  return group === 'inbox' ? '/tasks' : `/tasks/${group}`;
}
