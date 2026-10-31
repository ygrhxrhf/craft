import { describe, expect, it } from 'vitest';
import { summarizeColumn } from './summary';

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
