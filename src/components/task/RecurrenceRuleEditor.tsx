'use client';

import { useState } from 'react';

import { describeRecurrence, dynamicDayLabel, parseRecurrence, type DynamicDaySelector } from '@/lib/task/recurrence';
import {
  DAY_NUMBERS,
  DYNAMIC_TARGETS,
  FREQUENCY_LABELS,
  MONTH_PICK,
  RECURRENCE_FREQUENCIES,
  SELECTOR_OPTIONS,
  WEEKDAY_PICK,
  axesFor,
  patchRuleAxis,
  ruleWithFrequency,
  toggleDynamicDay,
  toggleNumber,
} from '@/lib/task/recurrence-picker';

/**
 * G406/G405: the repeat rule picker the official panel has — frequency, the day axis (weekdays when
 * weekly, day numbers when monthly/yearly), the month axis for yearly, and the relative-day list
 * (月末 / 最后一个周五 / 第三个周三). The rule model already stored all three axes; only this write
 * path was missing, so 「每月 3 日和 15 日」 and 「最后一个周五」 could be read but never built.
 */
const CHIP =
  'rounded border border-border px-1.5 py-0.5 text-[11px] transition-colors hover:bg-muted aria-pressed:border-(--craft-accent) aria-pressed:bg-(--craft-accent)/10 aria-pressed:text-foreground';

export function RecurrenceRuleEditor({
  raw,
  onChange,
}: {
  raw: string | null;
  onChange: (next: string | null) => void;
}) {
  const rule = parseRecurrence(raw);
  const freq = rule?.freq ?? 'monthly';
  const axes = axesFor(freq);

  return (
    <div className="space-y-1.5" data-testid="repeat-rule-editor">
      <div className="flex flex-wrap gap-1">
        {RECURRENCE_FREQUENCIES.map((option) => (
          <button
            key={option}
            type="button"
            data-testid={`repeat-frequency-${option}`}
            aria-pressed={freq === option}
            className={CHIP}
            onClick={() => onChange(ruleWithFrequency(raw, option))}
          >
            {FREQUENCY_LABELS[option]}
          </button>
        ))}
      </div>

      {axes.days && freq === 'weekly' && (
        <div className="flex flex-wrap gap-1">
          {WEEKDAY_PICK.map((day) => (
            <button
              key={day.value}
              type="button"
              data-testid={`repeat-weekday-${day.value}`}
              aria-pressed={(rule?.days ?? []).includes(day.value)}
              className={CHIP}
              onClick={() => onChange(patchRuleAxis(raw, { days: toggleNumber(rule?.days, day.value) }))}
            >
              {day.label}
            </button>
          ))}
        </div>
      )}

      {axes.days && freq !== 'weekly' && (
        <div className="flex flex-wrap gap-1">
          {DAY_NUMBERS.map((number) => (
            <button
              key={number}
              type="button"
              data-testid={`repeat-day-${number}`}
              aria-pressed={(rule?.days ?? []).includes(number)}
              className={CHIP}
              onClick={() =>
                onChange(
                  patchRuleAxis(raw, {
                    days: toggleNumber(rule?.days, number),
                    // The single legacy value is superseded by the array the moment it is picked.
                    byMonthDay: undefined,
                  }),
                )
              }
            >
              {number}
            </button>
          ))}
        </div>
      )}

      {axes.months && (
        <div className="flex flex-wrap gap-1">
          {MONTH_PICK.map((month) => (
            <button
              key={month.value}
              type="button"
              data-testid={`repeat-month-${month.value}`}
              aria-pressed={(rule?.months ?? []).includes(month.value)}
              className={CHIP}
              onClick={() => onChange(patchRuleAxis(raw, { months: toggleNumber(rule?.months, month.value) }))}
            >
              {month.label}
            </button>
          ))}
        </div>
      )}

      {axes.dynamic && <DynamicDayEditor raw={raw} onChange={onChange} />}

      <p className="text-[11px] text-muted-foreground" data-testid="repeat-rule-summary">
        {describeRecurrence(raw) ?? '尚未选择重复规则'}
      </p>
    </div>
  );
}

function DynamicDayEditor({ raw, onChange }: { raw: string | null; onChange: (next: string | null) => void }) {
  const rule = parseRecurrence(raw);
  const entries = rule?.dynamicDays ?? [];
  const [ordinal, setOrdinal] = useState<DynamicDaySelector>('last');

  const toggleEntry = (type: string, selector: DynamicDaySelector) =>
    onChange(patchRuleAxis(raw, { dynamicDays: toggleDynamicDay(entries, { type, selector }) }));

  return (
    <div className="space-y-1" data-testid="repeat-dynamic">
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entries.map((entry) => (
            <button
              key={`${entry.type}-${String(entry.selector)}`}
              type="button"
              data-testid="repeat-dynamic-chip"
              aria-pressed
              className="rounded border border-(--craft-accent) bg-(--craft-accent)/10 px-1.5 py-0.5 text-[11px] transition-colors hover:bg-(--craft-accent)/20"
              onClick={() => toggleEntry(entry.type, entry.selector)}
            >
              {dynamicDayLabel(entry)} ×
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1">
        <select
          aria-label="第几个"
          className="h-6 rounded border border-border bg-background px-1 text-[11px]"
          data-testid="repeat-dynamic-selector"
          value={String(ordinal)}
          onChange={(event) => {
            const next = SELECTOR_OPTIONS.find((option) => String(option.value) === event.target.value)?.value ?? 'last';
            setOrdinal(next);
          }}
        >
          {SELECTOR_OPTIONS.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1">
          {DYNAMIC_TARGETS.map((target) => (
            <button
              key={target.value}
              type="button"
              data-testid={`repeat-dynamic-${target.value}`}
              aria-pressed={entries.some((entry) => entry.type === target.value && entry.selector === ordinal)}
              className={CHIP}
              onClick={() => toggleEntry(target.value, ordinal)}
            >
              {target.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
