import { describe, expect, it } from 'vitest';
import {
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
