import { describe, expect, it } from 'vitest';

import { isOverdue, overdueLabel } from './overdue';

const now = new Date(2026, 9, 14, 10, 0);

describe('whether a task is overdue', () => {
  it('is overdue once its due day has passed', () => {
    expect(isOverdue(new Date(2026, 9, 13, 23, 0).toISOString(), false, now)).toBe(true);
  });

  it('is not overdue on the day it is due, or once completed', () => {
    expect(isOverdue(new Date(2026, 9, 14, 8, 0).toISOString(), false, now)).toBe(false);
    expect(isOverdue(new Date(2026, 9, 13).toISOString(), true, now)).toBe(false);
  });

  it('is not overdue without a date', () => {
    expect(isOverdue(null, false, now)).toBe(false);
  });
});

describe('the sentence', () => {
  it('names the day it was due', () => {
    expect(overdueLabel(new Date(2026, 9, 13).toISOString())).toBe('自 10月13日 起已逾期');
  });
});
