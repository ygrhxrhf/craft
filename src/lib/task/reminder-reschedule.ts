/**
 * `gap.md` G87 —— 带到期提醒的块改期要**先确认**（官方 `dialogs.md:77`）：
 *   `alert.reschedule.reminder.title`「此区块有一个即将到期的提醒。」
 *   `alert.reschedule.reminder.desc`「请确认你是否要更改。」
 * 逐字取自 `_harvest/i18n-zh.tsv:236-237`。
 *
 * ☆ 判据＝**块上已有一个"即将到期"的提醒**（`remindAt` 还没过）时才拦；没有提醒、或提醒已经过期，
 *   改期就直接落（官方那句说的是"upcoming reminder"，不是"任何提醒"）。
 */

export const RESCHEDULE_REMINDER_TITLE = '此区块有一个即将到期的提醒。';
export const RESCHEDULE_REMINDER_DESC = '请确认你是否要更改。';
export const RESCHEDULE_REMINDER_TITLE_KEY = 'alert.reschedule.reminder.title';
export const RESCHEDULE_REMINDER_DESC_KEY = 'alert.reschedule.reminder.desc';

/** 确认框的动作按钮文案（官方用「更改」，不是通用「确定」）。 */
export const RESCHEDULE_CONFIRM_LABEL = '更改';

/**
 * 该不该先弹确认：`remindAt` 解析得出、且**还在未来**（＝"即将到期"）。
 * 空值／坏值／已过期一律不拦。
 */
export function needsRescheduleConfirm(remindAt: unknown, now: Date = new Date()): boolean {
  if (typeof remindAt !== 'string' || !remindAt) return false;
  const at = new Date(remindAt);
  if (Number.isNaN(at.getTime())) return false;
  return at.getTime() > now.getTime();
}
