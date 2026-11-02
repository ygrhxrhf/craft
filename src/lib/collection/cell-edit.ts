/**
 * G452/G464/G465/G468 —— 单元格的"提交边界"规则集中在这一处：
 *
 * - 空一律收敛成 `null`（空串、纯空格、空数组、`items` 为空的关联对象），不存在
 *   "空数组／空串"两种空形态；
 * - 文本提交前 `trim()`，纯空格与空串同一条路；
 * - 数字输入先剥 `,`、空格、`%`、`$`，percent 档存小数（输入 12% 落 0.12），
 *   `isNaN` 一律 `null`；
 * - 编辑框打开时从当前 `value` 重取草稿（打开上升沿灌值），编辑中途不覆盖。
 */

import type { NumberFormat } from './property-types';

export function normalizeTextCommit(text: string | null | undefined): string | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

/** 把"各种空"收敛成 `null`：空串／纯空格、空数组、`items` 为空的关联对象。 */
export function normalizeCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return normalizeTextCommit(value);
  if (Array.isArray(value)) return value.length === 0 ? null : value;
  if (typeof value === 'object') {
    const items = (value as { items?: unknown }).items;
    if (Array.isArray(items) && items.length === 0) return null;
  }
  return value;
}

/**
 * 数字输入解析。percent 档接受带不带 `%`：`12%` 与 `12` 都落 0.12；
 * 其余档剥掉千分位与货币符号后按普通数字读。
 */
export function parseNumberInput(text: string | null | undefined, format: NumberFormat = 'number'): number | null {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/[,，\s%$¥]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return format === 'percent' ? n / 100 : n;
}

/** 打开编辑框时显示的草稿：percent 档把存下的小数乘回百分数，其余原样。 */
export function draftTextFor(value: unknown, format: NumberFormat = 'number'): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '';
  if (format === 'percent') {
    // 官方用 toPrecision(10) 抹掉浮点尾差（0.07*100 = 7.000000000000001）。
    return String(Number.parseFloat((n * 100).toPrecision(10)));
  }
  return String(n);
}
