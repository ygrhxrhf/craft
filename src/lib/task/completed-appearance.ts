/**
 * `gap.md` G160 —— 已完成任务的外观三档（官方 `preferences.advanced.completed.task.appearance.*`）。
 *
 * 官方三档的逐字标签（`_harvest/i18n-zh.tsv:2364-2369`）：
 *   淡化 `faded`／删除线 `strike`／无 `none`；说明句「自定义已完成任务在应用中的显示方式」。
 * 这里只做**取值→类名**的映射（纯函数，任务页与日历都用它），持久化走 `user` 表的
 * `completedTaskAppearance` 列（元数据，过离线内核）。
 */
export type CompletedTaskAppearance = 'faded' | 'strike' | 'none';

export const COMPLETED_TASK_APPEARANCES: CompletedTaskAppearance[] = ['faded', 'strike', 'none'];

/** 官方标签逐字（zh-Hans）。 */
export const COMPLETED_TASK_APPEARANCE_LABELS: Record<CompletedTaskAppearance, string> = {
  faded: '淡化',
  strike: '删除线',
  none: '无',
};

export const COMPLETED_TASK_APPEARANCE_TITLE = '完成任务的外观';
export const COMPLETED_TASK_APPEARANCE_DESC = '自定义已完成任务在应用中的显示方式';

/** 落库值可能是旧字符串或空值：认不出来的一律按默认档（删除线）。 */
export function normalizeCompletedTaskAppearance(value: unknown): CompletedTaskAppearance {
  return value === 'faded' || value === 'strike' || value === 'none' ? value : 'strike';
}

/**
 * 已完成的（或已取消的）任务行该带哪些类：
 * - `strike`＝删除线（本仓从前的唯一行为）＋弱化文字色；
 * - `faded`＝只弱化文字色、不划线；
 * - `none`＝原样，什么都不加。
 */
export function completedTaskClasses(appearance: unknown): string {
  const mode = normalizeCompletedTaskAppearance(appearance);
  if (mode === 'none') return '';
  if (mode === 'faded') return 'text-muted-foreground';
  return 'text-muted-foreground line-through';
}

/**
 * 从**本地 user 镜像**里挑出这台设备的偏好档（`user` 表在本地库里以 userId 当主键）。
 * ☆ 任务页是客户端组件，走镜像读＝与别的元数据读同源，也顺带让"改完设置页立刻生效"
 *   经由 `onStoreChanged('user')` 自然成立，不需要把偏好从四个路由文件各传一遍。
 */
export function appearanceFromUserRows(
  rows: Array<{ id: string; op?: string; data?: Record<string, unknown> }>,
  userId: string | undefined,
): CompletedTaskAppearance {
  if (!userId) return 'strike';
  const me = rows.find((r) => r.id === userId && r.op !== 'delete');
  return normalizeCompletedTaskAppearance(me?.data?.completedTaskAppearance);
}

