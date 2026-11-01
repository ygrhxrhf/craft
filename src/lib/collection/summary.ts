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

/** Apply a chosen calculation to a column's values; `''` when there is nothing to show. */
export function applyCalculation(
  calculation: SummaryCalculation,
  values: unknown[],
): string {
  const numbers = values.map(numeric).filter((value): value is number => value !== null);
  const filled = values.filter((value) => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });

  switch (calculation) {
    case 'none':
      return '';
    case 'sum':
      return numbers.length ? String(numbers.reduce((total, value) => total + value, 0)) : '';
    case 'average':
      return numbers.length ? String(numbers.reduce((total, value) => total + value, 0) / numbers.length) : '';
    case 'min':
      return numbers.length ? String(Math.min(...numbers)) : '';
    case 'max':
      return numbers.length ? String(Math.max(...numbers)) : '';
    case 'median': {
      if (!numbers.length) return '';
      const sorted = [...numbers].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return String(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2);
    }
    case 'count':
      return String(numbers.length);
    case 'countFilled':
      return String(filled.length);
  }
}
