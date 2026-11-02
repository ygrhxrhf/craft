export interface SummaryProperty {
  type: string;
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/**
 * G41: the summary row's default per-column calculation. Numbers add up;
 * everything else counts non-empty values. A column with nothing to show is
 * blank rather than a misleading zero.
 */
export function summarizeColumn(property: SummaryProperty, values: unknown[]): string {
  if (property.type === 'number') {
    const numbers = values.map(numeric).filter((value): value is number => value !== null);
    if (numbers.length === 0) return '';
    return String(numbers.reduce((total, value) => total + value, 0));
  }
  const filled = values.filter((value) => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
  if (filled.length === 0) return '';
  if (property.type === 'checkbox') {
    return `${filled.filter((value) => value === true || value === 'true').length}`;
  }
  return `${filled.length}`;
}

/**
 * G41: the summary row's **calculations** — the official `CalculationsRow` lets a column pick
 * which function it shows, not just the type default. These are the choices a numeric column
 * offers; the picker writes one onto the property's config.
 */
export type SummaryCalculation =
  | 'none'
  | 'sum'
  | 'average'
  | 'min'
  | 'max'
  | 'median'
  | 'count'
  | 'countFilled';

export const SUMMARY_CALCULATIONS: readonly SummaryCalculation[] = [
  'none',
  'sum',
  'average',
  'min',
  'max',
  'median',
  'count',
  'countFilled',
];

export const SUMMARY_CALCULATION_LABELS: Record<SummaryCalculation, string> = {
  none: '无',
  sum: '求和',
  average: '平均值',
  min: '最小值',
  max: '最大值',
  median: '中位数',
  count: '计数',
  countFilled: '非空计数',
};

/**
 * G91 —— 官方计算行是 21 项，且按列类型限制可选集：
 * 基础集（所有列）+ 数字专属 + 日期专属 + 勾选专属。每项有 menu／cell 两套标签；
 * 百分比的分母是**总行数**；数字聚合遇到空集返回 undefined（显示为空，不是 0）。
 */
export type AggregationId =
  | 'count_all'
  | 'count_empty'
  | 'count_notEmpty'
  | 'count_values'
  | 'count_unique'
  | 'percent_empty'
  | 'percent_notEmpty'
  | 'number_sum'
  | 'number_average'
  | 'number_median'
  | 'number_min'
  | 'number_max'
  | 'number_range'
  | 'date_min'
  | 'date_max'
  | 'date_range_days'
  | 'date_range_months'
  | 'count_checkbox_checked'
  | 'count_checkbox_unchecked'
  | 'percent_checkbox_checked'
  | 'percent_checkbox_unchecked';

export type AggregationFamily = 'base' | 'number' | 'date' | 'checkbox';

export interface AggregationOption {
  id: AggregationId;
  family: AggregationFamily;
  /** 菜单里的名字。 */
  menu: string;
  /** 汇总格里的短标签。 */
  cell: string;
}

export const AGGREGATIONS: readonly AggregationOption[] = [
  { id: 'count_all', family: 'base', menu: '全部计数', cell: '全部' },
  { id: 'count_empty', family: 'base', menu: '空值计数', cell: '空' },
  { id: 'count_notEmpty', family: 'base', menu: '非空计数', cell: '非空' },
  { id: 'count_values', family: 'base', menu: '值计数', cell: '值' },
  { id: 'count_unique', family: 'base', menu: '唯一值计数', cell: '唯一' },
  { id: 'percent_empty', family: 'base', menu: '空值百分比', cell: '空 %' },
  { id: 'percent_notEmpty', family: 'base', menu: '非空百分比', cell: '非空 %' },
  { id: 'number_sum', family: 'number', menu: '求和', cell: '求和' },
  { id: 'number_average', family: 'number', menu: '平均值', cell: '平均' },
  { id: 'number_median', family: 'number', menu: '中位数', cell: '中位' },
  { id: 'number_min', family: 'number', menu: '最小值', cell: '最小' },
  { id: 'number_max', family: 'number', menu: '最大值', cell: '最大' },
  { id: 'number_range', family: 'number', menu: '范围', cell: '范围' },
  { id: 'date_min', family: 'date', menu: '最早日期', cell: '最早' },
  { id: 'date_max', family: 'date', menu: '最晚日期', cell: '最晚' },
  { id: 'date_range_days', family: 'date', menu: '日期范围（天）', cell: '天数' },
  { id: 'date_range_months', family: 'date', menu: '日期范围（月）', cell: '月数' },
  { id: 'count_checkbox_checked', family: 'checkbox', menu: '已勾选计数', cell: '已勾选' },
  { id: 'count_checkbox_unchecked', family: 'checkbox', menu: '未勾选计数', cell: '未勾选' },
  { id: 'percent_checkbox_checked', family: 'checkbox', menu: '已勾选百分比', cell: '已勾选 %' },
  { id: 'percent_checkbox_unchecked', family: 'checkbox', menu: '未勾选百分比', cell: '未勾选 %' },
];

export const BASE_AGGREGATIONS: readonly AggregationId[] = AGGREGATIONS.filter(
  (option) => option.family === 'base',
).map((option) => option.id);

/** 某一列类型能选哪些聚合（基础集 + 该类型的专属集）。 */
export function aggregationsFor(type: string): AggregationId[] {
  const family: AggregationFamily | null =
    type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'checkbox' ? 'checkbox' : null;
  return AGGREGATIONS.filter((option) => option.family === 'base' || option.family === family).map(
    (option) => option.id,
  );
}

export function aggregationLabel(id: AggregationId, part: 'menu' | 'cell' = 'menu'): string {
  return AGGREGATIONS.find((option) => option.id === id)?.[part] ?? '';
}

function percent(part: number, total: number): string {
  if (total <= 0) return '';
  const value = (part / total) * 100;
  return `${Number.parseFloat(value.toFixed(1))}%`;
}

function numericValues(values: unknown[]): number[] {
  return values.map(numeric).filter((value): value is number => value !== null);
}

function dateValues(values: unknown[]): number[] {
  return values
    .map((value) => (typeof value === 'string' ? Date.parse(value) : Number.NaN))
    .filter((stamp) => Number.isFinite(stamp));
}

/**
 * 按 21 项算一格。`rowCount` 是总行数（百分比分母）；数字/日期聚合空集返回 `''`。
 */
export function applyAggregation(id: AggregationId, values: unknown[], rowCount = values.length): string {
  const filled = values.filter((value) => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
  const numbers = numericValues(values);
  const dates = dateValues(values);

  switch (id) {
    case 'count_all':
      return String(values.length);
    case 'count_empty':
      return String(values.length - filled.length);
    case 'count_notEmpty':
    case 'count_values':
      return String(filled.length);
    case 'count_unique':
      return String(new Set(filled.map((value) => JSON.stringify(value))).size);
    case 'percent_empty':
      return percent(rowCount - filled.length, rowCount);
    case 'percent_notEmpty':
      return percent(filled.length, rowCount);
    case 'number_sum':
      return numbers.length ? String(numbers.reduce((total, value) => total + value, 0)) : '';
    case 'number_average':
      return numbers.length ? String(numbers.reduce((total, value) => total + value, 0) / numbers.length) : '';
    case 'number_median': {
      if (!numbers.length) return '';
      const sorted = [...numbers].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return String(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2);
    }
    case 'number_min':
      return numbers.length ? String(Math.min(...numbers)) : '';
    case 'number_max':
      return numbers.length ? String(Math.max(...numbers)) : '';
    case 'number_range':
      return numbers.length ? String(Math.max(...numbers) - Math.min(...numbers)) : '';
    case 'date_min':
      return dates.length ? new Date(Math.min(...dates)).toISOString().slice(0, 10) : '';
    case 'date_max':
      return dates.length ? new Date(Math.max(...dates)).toISOString().slice(0, 10) : '';
    case 'date_range_days':
      return dates.length ? String(Math.round((Math.max(...dates) - Math.min(...dates)) / 86_400_000)) : '';
    case 'date_range_months':
      return dates.length
        ? String(Number.parseFloat(((Math.max(...dates) - Math.min(...dates)) / (86_400_000 * 30.4375)).toFixed(1)))
        : '';
    case 'count_checkbox_checked': {
      const checked = values.filter((value) => value === true || value === 'true').length;
      return String(checked);
    }
    case 'count_checkbox_unchecked': {
      const checked = values.filter((value) => value === true || value === 'true').length;
      return String(values.length - checked);
    }
    case 'percent_checkbox_checked': {
      const checked = values.filter((value) => value === true || value === 'true').length;
      return percent(checked, rowCount);
    }
    case 'percent_checkbox_unchecked': {
      const checked = values.filter((value) => value === true || value === 'true').length;
      return percent(values.length - checked, rowCount);
    }
  }
}

/** 旧配置里的名字映射到官方 21 项，避免历史行丢选择。 */
const LEGACY_ALIASES: Partial<Record<SummaryCalculation, AggregationId>> = {
  sum: 'number_sum',
  average: 'number_average',
  min: 'number_min',
  max: 'number_max',
  median: 'number_median',
};

/** Apply a chosen calculation to a column's values; `''` when there is nothing to show. */
export function applyCalculation(
  calculation: SummaryCalculation,
  values: unknown[],
  rowCount = values.length,
): string {
  if (calculation === 'none') return '';
  // 旧 'count' 数的是**数字个数**，保留原语义；新的 count_values 数非空值。
  if (calculation === 'count') return String(numericValues(values).length);
  if (calculation === 'countFilled') return applyAggregation('count_notEmpty', values, rowCount);
  const alias = LEGACY_ALIASES[calculation];
  if (alias) return applyAggregation(alias, values, rowCount);
  if ((AGGREGATIONS as readonly { id: string }[]).some((option) => option.id === calculation)) {
    return applyAggregation(calculation as AggregationId, values, rowCount);
  }
  return '';
}
