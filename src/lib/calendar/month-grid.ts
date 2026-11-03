/**
 * G363 的日历网格口径：**周一起始**、**固定 6 行**（上下月补位灰格）、今天可高亮。
 * 网格本身交给 `react-day-picker` 渲染，这里只提供纯数据与口径，便于单测与别处复用。
 */

/** 周一起始的列头，顺序与官方中文 locale 一致。 */
export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

/** 「今天」快捷项，语言包 `date.today`。 */
export const TODAY_LABEL = '今天';
export const TODAY_KEY = 'date.today';

export interface GridDay {
  date: Date;
  /** 属于上/下月的补位格。 */
  outside: boolean;
}

const DAYS_IN_GRID = 6 * 7;

function startOfWeekMonday(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

/** 6×7 的月网格：首格是包含本月 1 号的那一周的周一，末格是第 42 天。 */
export function monthGrid(month: Date): GridDay[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = startOfWeekMonday(first);
  const rows: GridDay[][] = [];
  for (let row = 0; row < 6; row += 1) {
    const days: GridDay[] = [];
    for (let column = 0; column < 7; column += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + row * 7 + column);
      days.push({ date, outside: date.getMonth() !== month.getMonth() });
    }
    rows.push(days);
  }
  return rows;
}

/** 上/下月按钮的落点（按自然月推进，日号回到 1 号，交给 Date 处理月末溢出）。 */
export function shiftMonth(month: Date, delta: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 网格恒为 6×7＝42 格，与官方"6 行网格"一致。 */
export const MONTH_GRID_DAYS = DAYS_IN_GRID;
