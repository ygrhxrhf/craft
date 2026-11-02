import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  HIDE_CALCULATION_ROW,
  SHOW_CALCULATION_ROW,
  SHOW_CALCULATION_ROW_CONFIG_KEY,
  calculationRowToggle,
  readShowCalculationRow,
  withShowCalculationRow,
} from './summary-row';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('the calculation row switch (G286)', () => {
  it('takes both labels from the catalog', () => {
    expect(ledgerValue(SHOW_CALCULATION_ROW.key)).toBe(SHOW_CALCULATION_ROW.label);
    expect(ledgerValue(HIDE_CALCULATION_ROW.key)).toBe(HIDE_CALCULATION_ROW.label);
  });

  it('offers the opposite action of the current state', () => {
    expect(calculationRowToggle(true)).toBe(HIDE_CALCULATION_ROW);
    expect(calculationRowToggle(false)).toBe(SHOW_CALCULATION_ROW);
  });

  it('defaults to shown and reads both stored shapes', () => {
    expect(readShowCalculationRow(null)).toBe(true);
    expect(readShowCalculationRow('{}')).toBe(true);
    expect(readShowCalculationRow('not json')).toBe(true);
    expect(readShowCalculationRow({ [SHOW_CALCULATION_ROW_CONFIG_KEY]: false })).toBe(false);
    expect(readShowCalculationRow(`{"${SHOW_CALCULATION_ROW_CONFIG_KEY}":false}`)).toBe(false);
  });

  it('always writes the flag so sibling config keys cannot drop it', () => {
    const next = withShowCalculationRow({ filters: [], sorts: [], groupBy: null }, false);
    expect(next).toEqual({
      filters: [],
      sorts: [],
      groupBy: null,
      [SHOW_CALCULATION_ROW_CONFIG_KEY]: false,
    });
    expect(withShowCalculationRow(next, true)[SHOW_CALCULATION_ROW_CONFIG_KEY]).toBe(true);
  });

  it('is hung on the table view: state, persistence, toggle and both tfoots', () => {
    const view = readFileSync(
      join(process.cwd(), 'src', 'app', '(app)', 'collections', '[id]', 'TableView.tsx'),
      'utf8',
    );
    expect(view).toContain('readShowCalculationRow(initialConfig)');
    expect(view).toContain('withShowCalculationRow(next, showOverride ?? showSummary)');
    expect(view).toContain('calculationRowToggle(showSummary).label');
    // 分组与不分组两张表都要跟着收起
    expect(view.match(/\{showSummary && \(/g)).toHaveLength(2);
  });
});
