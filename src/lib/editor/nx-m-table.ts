/**
 * G336 —— 快捷面板的 `NxM` 直接生表格（`tasks.md` §11.5）。
 *
 * 官方那条候选项生成器：`Rrn = /^(?<rows>\d+)x?(?<cols>\d*)$/i`，`cols` 省略即等于 rows
 * （`s==="" ? i : parseInt(s)`），抑制条件 `i<=9 && i===l || i===0 || l===0 ⇒ []`
 * ⇒ **≤9 的正方形不弹候选**（`4x4` 没有候选，`10x10` 才有）。
 *
 * 尺寸再按本地表格硬上限收口（`limits.ts` 的 50 行 / 15 列 / 750 格）：官方那条输入自己
 * 有没有上限没采到，但 50×15＝750 正好是同一组上限，收口后快捷输入绕不过屏上已有的超限口径。
 */

import { MAX_TABLE_COLS, MAX_TABLE_ROWS } from '@/lib/collection/limits';

/**
 * 官方正则是 `/^(?<rows>\d+)x?(?<cols>\d*)$/i`；两处本地差异：
 * - 本仓编译目标低于 ES2018 ⇒ **命名捕获组是语法错误**，用位置捕获组读同一形状（`1`=rows、`2`=cols）；
 * - 分隔符收成 `[x×]`：TipTap Typography 的 `multiplication` 输入规则会把数字之间的 `x`
 *   换成 `×`（`typography` 在本仓的 `enableInputRules` 允许名单里），真打字到解析层时已经是 `×`。
 */
export const NXM_PATTERN = /^(\d+)[x×]?(\d*)$/i;

export interface TableShortcutSize {
  rows: number;
  cols: number;
}

/**
 * 把快捷面板里的输入解析成表尺寸；解析不出来、或按官方规则该被抑制时回 `null`
 * ⇒ 调用方据此决定"要不要多给一个表格候选"。
 */
export function parseTableShortcut(query: string): TableShortcutSize | null {
  const match = NXM_PATTERN.exec(query.trim());
  if (!match) return null;

  const rows = Number.parseInt(match[1] ?? '', 10);
  const colsText = match[2] ?? '';
  const cols = colsText === '' ? rows : Number.parseInt(colsText, 10);
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) return null;

  // 抑制条件的后半：任一边为 0。
  if (rows === 0 || cols === 0) return null;
  // 抑制条件的前半：≤9 的正方形不给候选（`4x4` 没有、`10x10` 才有）。
  if (rows === cols && rows <= 9) return null;

  return {
    rows: Math.min(rows, MAX_TABLE_ROWS),
    cols: Math.min(cols, MAX_TABLE_COLS),
  };
}
