'use client';

import {
  AGGREGATIONS,
  applyAggregation,
  aggregationLabel,
  aggregationsFor,
  type AggregationId,
} from '@/lib/collection/summary';

/**
 * G91：汇总格既是读数，也是选择器——点开列出该列类型允许的聚合（基础集 + 专属集），
 * 选择写进列 config 的 `summaryCalculation`；「默认」清掉这一键，回落到按类型的默认读数。
 */
export function SummaryCell({
  type,
  current,
  values,
  rowCount,
  onPick,
}: {
  type: string;
  current: AggregationId | null;
  values: unknown[];
  rowCount: number;
  onPick: (next: AggregationId | null) => void;
}) {
  const options = aggregationsFor(type);
  const display = current ? applyAggregation(current, values, rowCount) : defaultSummary(type, values);

  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 truncate" data-testid="summary-value">
        {display}
      </span>
      <select
        aria-label="汇总方式"
        className="max-w-[84px] cursor-pointer truncate rounded border border-transparent bg-transparent text-[11px] text-muted-foreground/80 hover:border-border"
        value={current ?? ''}
        onChange={(event) => {
          const value = event.target.value;
          onPick(value === '' ? null : (value as AggregationId));
        }}
      >
        <option value="">默认</option>
        {options.map((id) => (
          <option key={id} value={id}>
            {aggregationLabel(id)}
          </option>
        ))}
      </select>
    </span>
  );
}

function defaultSummary(type: string, values: unknown[]): string {
  if (type === 'number') return applyAggregation('number_sum', values);
  if (type === 'checkbox') return applyAggregation('count_checkbox_checked', values);
  if (type === 'date') return applyAggregation('date_min', values);
  const filled = values.filter((value) => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
  return filled.length ? String(filled.length) : '';
}

/** 从列 config（JSON 串或对象）里取已选的聚合 id；不认识的值当没选。 */
export function aggregationFromConfig(config: unknown): AggregationId | null {
  let raw: unknown = config;
  if (typeof config === 'string') {
    try {
      raw = (JSON.parse(config) as { summaryCalculation?: unknown }).summaryCalculation;
    } catch {
      return null;
    }
  } else if (config && typeof config === 'object') {
    raw = (config as { summaryCalculation?: unknown }).summaryCalculation;
  } else {
    return null;
  }
  if (typeof raw !== 'string') return null;
  return (AGGREGATIONS as readonly { id: string }[]).some((option) => option.id === raw)
    ? (raw as AggregationId)
    : null;
}
