/**
 * G411 —— 提醒时刻是一条 **96 档、15 分钟步长**的全天菜单（`tasks.md` §10.8）。
 *
 * 官方常量：`Ov=15`（分钟步长）、`minWidth 236 / maxHeight 200 / bottom-start`、等宽数字、
 * **打开即滚到当前时刻所在格**；「不提醒」行**仅在当前已设提醒时出现**；
 * `u(null)` 写 `{enabled:false, dateOffset:undefined}`（清空形态）。
 *
 * 本地是原生 `<Input type="datetime-local">`。本模块给出 96 档的生成、滚动锚点与清空形态，
 * 供将来的菜单组件直接消费。
 */

export const MINUTES_PER_SLOT = 15;
export const SLOTS_PER_DAY = (24 * 60) / MINUTES_PER_SLOT; // 96

export interface TimeSlot {
  /** 0 基档位序号（0…95）。 */
  index: number;
  /** 自午夜的分钟数。 */
  minutes: number;
  /** `HH:MM`（24 小时制，等宽显示用）。 */
  label: string;
}

/** 96 档的完整列表。 */
export function timeSlots(): TimeSlot[] {
  return Array.from({ length: SLOTS_PER_DAY }, (_, index) => {
    const minutes = index * MINUTES_PER_SLOT;
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return {
      index,
      minutes,
      label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    };
  });
}

/** 打开菜单时应滚到的那一档：**向下取整**到最近的一档（当前 10:07 ⇒ 10:00 那档）。 */
export function slotIndexForTime(date: Date): number {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return Math.floor(minutes / MINUTES_PER_SLOT);
}

/** 把某档折算回当天的绝对时刻（保持日期、换掉时分）。 */
export function instantForSlot(date: Date, index: number): Date {
  const slot = Math.min(Math.max(0, Math.trunc(index)), SLOTS_PER_DAY - 1);
  const next = new Date(date);
  next.setHours(0, slot * MINUTES_PER_SLOT, 0, 0);
  return next;
}

/**
 * 清空形态：官方 `u(null)` 写 `{enabled:false, dateOffset:undefined}`——
 * 不是把时间设成午夜，而是**关掉提醒并把偏移抹掉**。
 */
export interface ReminderSetting {
  enabled: boolean;
  dateOffset: number | undefined;
}

export function clearedReminder(): ReminderSetting {
  return { enabled: false, dateOffset: undefined };
}

/**
 * 「不提醒」行只在**当前已设提醒**时出现（官方那条条件渲染）。
 */
export function showsClearRow(current: ReminderSetting | null | undefined): boolean {
  return Boolean(current?.enabled);
}
