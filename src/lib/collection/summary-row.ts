/**
 * G286 的第二半：计算行可以整行显掉。官方的两枚标签逐字来自语言包，
 * 缺省是**显示**（列上的 `summaryCalculation` 只管读数，不管行的存在）。
 */

export const SHOW_CALCULATION_ROW = {
  label: '显示计算行',
  key: 'collections.show.calculation.row',
} as const;

export const HIDE_CALCULATION_ROW = {
  label: '隐藏计算行',
  key: 'collections.hide.calculation.row',
} as const;

/** 视图配置里的那一枚键；缺省＝显示。 */
export const SHOW_CALCULATION_ROW_CONFIG_KEY = 'showSummaryRow';

export type CalculationRowCopy = { label: string; key: string };

/** 下一次点击的标签：行在就提供「隐藏」，行没了才提供「显示」。 */
export function calculationRowToggle(show: boolean): CalculationRowCopy {
  return show ? HIDE_CALCULATION_ROW : SHOW_CALCULATION_ROW;
}

/** 从视图 config（字符串或对象）读出显隐；读不懂就当显示。 */
export function readShowCalculationRow(config: unknown): boolean {
  let value = config;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return true;
    }
  }
  if (!value || typeof value !== 'object') return true;
  const raw = (value as Record<string, unknown>)[SHOW_CALCULATION_ROW_CONFIG_KEY];
  return raw !== false;
}

/** 写回视图 config：每次都显式落一枚布尔，别的字段才不会顺带把它抹掉。 */
export function withShowCalculationRow<T extends Record<string, unknown>>(
  config: T,
  show: boolean,
): T & Record<string, unknown> {
  return { ...config, [SHOW_CALCULATION_ROW_CONFIG_KEY]: show };
}
