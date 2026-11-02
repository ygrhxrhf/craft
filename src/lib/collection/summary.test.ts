import { describe, expect, it } from 'vitest';
import {
  AGGREGATIONS,
  aggregationsFor,
  applyAggregation,
  applyCalculation,
  summarizeColumn,
  SUMMARY_CALCULATION_LABELS,
  SUMMARY_CALCULATIONS,
} from './summary';

describe('collection summary row (G41)', () => {
  it('sums number columns and ignores blanks', () => {
    expect(summarizeColumn({ type: 'number' }, [1, '2', null, '', 'x'])).toBe('3');
    expect(summarizeColumn({ type: 'number' }, [])).toBe('');
  });

  it('counts non-empty values for other columns', () => {
    expect(summarizeColumn({ type: 'text' }, ['a', '', null, 'b'])).toBe('2');
    expect(summarizeColumn({ type: 'multi_select' }, [['a'], [], null])).toBe('1');
  });

  it('counts true checkboxes', () => {
    expect(summarizeColumn({ type: 'checkbox' }, [true, false, 'true', null])).toBe('2');
    expect(summarizeColumn({ type: 'checkbox' }, [false, null])).toBe('0');
    expect(summarizeColumn({ type: 'checkbox' }, [null])).toBe('');
  });
});

// G41: the CalculationsRow choices — a column picks which function its summary shows.
describe('summary calculations (G41)', () => {
  it('names the eight choices', () => {
    expect(SUMMARY_CALCULATIONS).toHaveLength(8);
    expect(SUMMARY_CALCULATION_LABELS.sum).toBe('求和');
    expect(SUMMARY_CALCULATION_LABELS.countFilled).toBe('非空计数');
  });

  it('applies each numeric calculation', () => {
    const values = [1, 2, 3, 4];
    expect(applyCalculation('sum', values)).toBe('10');
    expect(applyCalculation('average', values)).toBe('2.5');
    expect(applyCalculation('min', values)).toBe('1');
    expect(applyCalculation('max', values)).toBe('4');
    expect(applyCalculation('median', values)).toBe('2.5');
    expect(applyCalculation('count', values)).toBe('4');
    expect(applyCalculation('countFilled', values)).toBe('4');
  });

  it('is blank when there is nothing to show', () => {
    expect(applyCalculation('sum', [])).toBe('');
    expect(applyCalculation('average', ['x'])).toBe('');
    expect(applyCalculation('none', [1, 2])).toBe('');
  });

  it('counts non-empty values separately from numbers', () => {
    expect(applyCalculation('count', ['x', 1])).toBe('1');
    expect(applyCalculation('countFilled', ['x', 1])).toBe('2');
  });
});

// G91: twenty-one aggregations, gated by column type, with percentages over the total row count.
describe('the official aggregation set (G91)', () => {
  it('lists twenty-one entries', () => {
    expect(AGGREGATIONS).toHaveLength(21);
  });

  it('gates the extra families by column type', () => {
    const text = aggregationsFor('text');
    expect(text).not.toContain('number_sum');
    expect(text).not.toContain('date_min');
    expect(text).not.toContain('count_checkbox_checked');
    expect(aggregationsFor('number')).toContain('number_sum');
    expect(aggregationsFor('date')).toContain('date_range_days');
    expect(aggregationsFor('checkbox')).toContain('percent_checkbox_checked');
  });

  it('counts empties, filled, values and uniques', () => {
    const values = [1, null, '', 'a', 'a', [], ['z']];
    expect(applyAggregation('count_all', values)).toBe('7');
    expect(applyAggregation('count_empty', values)).toBe('3');
    expect(applyAggregation('count_notEmpty', values)).toBe('4');
    expect(applyAggregation('count_values', values)).toBe('4');
    expect(applyAggregation('count_unique', values)).toBe('3');
  });

  it('divides percentages by the total row count, not the filled count', () => {
    expect(applyAggregation('percent_notEmpty', [1, null, '', null], 4)).toBe('25%');
    expect(applyAggregation('percent_empty', [1, null, '', null], 4)).toBe('75%');
  });

  it('computes the number family and leaves an empty set blank', () => {
    const values = [1, 2, 3, 4];
    expect(applyAggregation('number_sum', values)).toBe('10');
    expect(applyAggregation('number_average', values)).toBe('2.5');
    expect(applyAggregation('number_median', values)).toBe('2.5');
    expect(applyAggregation('number_min', values)).toBe('1');
    expect(applyAggregation('number_max', values)).toBe('4');
    expect(applyAggregation('number_range', values)).toBe('3');
    expect(applyAggregation('number_sum', ['x', null])).toBe('');
  });

  it('computes the date family', () => {
    const values = ['2026-03-01T00:00:00.000Z', '2026-03-11T00:00:00.000Z'];
    expect(applyAggregation('date_min', values)).toBe('2026-03-01');
    expect(applyAggregation('date_max', values)).toBe('2026-03-11');
    expect(applyAggregation('date_range_days', values)).toBe('10');
    expect(applyAggregation('date_min', ['bad'])).toBe('');
  });

  it('computes the checkbox family', () => {
    const values = [true, false, true, null];
    expect(applyAggregation('count_checkbox_checked', values)).toBe('2');
    expect(applyAggregation('count_checkbox_unchecked', values)).toBe('2');
    expect(applyAggregation('percent_checkbox_checked', values, 4)).toBe('50%');
  });

  it('has a menu and a cell label for every entry', () => {
    for (const option of AGGREGATIONS) {
      expect(option.menu.length).toBeGreaterThan(0);
      expect(option.cell.length).toBeGreaterThan(0);
    }
  });
});
