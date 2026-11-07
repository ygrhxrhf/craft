'use client';

import { INTERVAL_MAX, parseRecurrence } from '@/lib/task/recurrence';
import { patchInterval } from '@/lib/task/recurrence-picker';

/**
 * G266/G404: the official interval picker is a menu of `1 … ceiling(frequency)` entries
 * (31/52/12/10), not a free number field — choosing a **smaller** entry resets the interval to 1
 * (`ft > An ? 1 : …`, see `nextInterval`). Both the row panel and the popover drawer use this.
 */
export function RepeatIntervalSelect({
  raw,
  onChange,
  className = 'h-6 rounded border border-border bg-background px-1 text-xs',
}: {
  raw: string | null;
  onChange: (next: string) => void;
  className?: string;
}) {
  const rule = parseRecurrence(raw);
  if (!rule) return null;
  const ceiling = INTERVAL_MAX[rule.freq];
  return (
    <select
      aria-label="重复间隔"
      data-testid="repeat-interval"
      value={rule.interval ?? 1}
      onChange={(event) => onChange(patchInterval(raw, Number(event.target.value)))}
      className={className}
    >
      {Array.from({ length: ceiling }, (_, index) => index + 1).map((step) => (
        <option key={step} value={step}>
          {step}
        </option>
      ))}
    </select>
  );
}