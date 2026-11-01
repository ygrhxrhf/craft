/**
 * G357 —— 任务块行下浮出**三枚并列时间图标**（日历/旗子/提醒），是三套时间语义在文档内的入口
 * （`interactions.md` V33 ②，已读图）。
 *
 * 本地任务块只有一枚提醒 pill。本模块把三枚图标的语义、标签与"什么时候点亮"写出来：
 *   - 日历（**计划日期**，`tasks.scheduled.for`「预定于 [0]」）；
 *   - 旗子（**截止日期**，`tasks.deadline.set.for`「截止日期为 [0]」）；
 *   - 提醒（**提醒时点**，「提醒我…」）。
 * 三枚并列 ⇒ 三套语义在行内**各有自己的入口**，不是一枚日期框切换。
 */

export type TimeIconKind = 'schedule' | 'deadline' | 'reminder';

export interface TimeIconSpec {
  kind: TimeIconKind;
  /** 官方文案键（提醒那枚是本地短标签，见 `TaskDatePopover`）。 */
  key: string | null;
  /** 有值时的整句模板（含 `[0]` 日期占位）；提醒那枚没有整句。 */
  template: string | null;
  label: string;
}

export const TIME_ICONS: readonly TimeIconSpec[] = [
  { kind: 'schedule', key: 'tasks.scheduled.for', template: '预定于 [0]', label: '计划日期' },
  { kind: 'deadline', key: 'tasks.deadline.set.for', template: '截止日期为 [0]', label: '截止日期' },
  // 提醒那枚没有「X 为 [0]」的整句，只有菜单里那句「提醒我…」。
  { kind: 'reminder', key: null, template: null, label: '提醒我…' },
] as const;

/** 某一枚的整句（有值时显示在行上）；提醒那枚没有整句，返回 `null`。 */
export function iconSentence(kind: TimeIconKind, dateText: string): string | null {
  const spec = TIME_ICONS.find((icon) => icon.kind === kind);
  if (!spec?.template) return null;
  return spec.template.replace('[0]', dateText);
}

/** 某一枚是否点亮（对应字段有值）。 */
export interface TimeIconState {
  schedule: string | null;
  deadline: string | null;
  reminder: string | null;
}

export function litIcons(state: TimeIconState): TimeIconKind[] {
  const lit: TimeIconKind[] = [];
  if (state.schedule) lit.push('schedule');
  if (state.deadline) lit.push('deadline');
  if (state.reminder) lit.push('reminder');
  return lit;
}

/** 三枚恒在（未点亮的也占位，好让行内布局稳定）。 */
export function alwaysVisible(): TimeIconKind[] {
  return ['schedule', 'deadline', 'reminder'];
}
