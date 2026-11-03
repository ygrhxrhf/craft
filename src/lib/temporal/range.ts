/**
 * G553 的两枚时间工具：
 *
 * - `withinRange(value, start, end, {includeStart, includeEnd})` —— 带端点开关的区间判定；
 * - `nearestDay(instant)` —— 就近归日：以当日中点为界，过了中点归次日（官方 `fLe`）。
 */

export interface RangeOptions {
  includeStart?: boolean;
  includeEnd?: boolean;
}

export function withinRange(
  value: Date | number,
  start: Date | number,
  end: Date | number,
  options: RangeOptions = {},
): boolean {
  const v = value instanceof Date ? value.getTime() : value;
  const s = start instanceof Date ? start.getTime() : start;
  const e = end instanceof Date ? end.getTime() : end;
  const includeStart = options.includeStart !== false;
  const includeEnd = options.includeEnd !== false;
  const afterStart = includeStart ? v >= s : v > s;
  const beforeEnd = includeEnd ? v <= e : v < e;
  return afterStart && beforeEnd;
}

/**
 * 就近归日：取当日 0 点与次日 0 点里离该时刻更近的那一晚。
 * 正好落在中点（12:00）时归次日——与官方「跨过当日中点 ⇒ 归次日」一致。
 */
export function nearestDay(instant: Date): Date {
  const dayStart = new Date(instant.getFullYear(), instant.getMonth(), instant.getDate());
  const nextStart = new Date(instant.getFullYear(), instant.getMonth(), instant.getDate() + 1);
  const midpoint = (dayStart.getTime() + nextStart.getTime()) / 2;
  return instant.getTime() >= midpoint ? nextStart : dayStart;
}
