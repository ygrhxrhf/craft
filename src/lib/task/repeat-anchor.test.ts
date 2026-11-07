import { describe, expect, it } from 'vitest';

import {
  REPEAT_FIXED_NOTE,
  REPEAT_FIXED_NOTE_KEY,
  REPEAT_FLEXIBLE_NOTE_KEY,
  repeatAnchorNote,
} from './repeat-anchor';

/**
 * G637 —— 两档锚点由文案给出，官方把这段解释做成强调色横幅。两句都逐字取自
 * `feature-catalog.md`（`tasks.complete.task.decs` 与 `tasks.task.rescheduled.to.x.later`）。
 */
describe('the anchor banner (G637)', () => {
  it('explains fixed with the official sentence', () => {
    expect(repeatAnchorNote('{"freq":"daily","type":"fixed"}')).toEqual({
      key: REPEAT_FIXED_NOTE_KEY,
      text: REPEAT_FIXED_NOTE,
    });
    expect(REPEAT_FIXED_NOTE).toBe('当你完成任务时，下一个任务将根据原始计划日期进行安排。');
  });

  it('explains flexible with the interval phrase in [0]', () => {
    expect(repeatAnchorNote('{"freq":"weekly","type":"flexible","interval":2}')).toEqual({
      key: REPEAT_FLEXIBLE_NOTE_KEY,
      text: '当你完成任务后，下一个任务将被安排在 2 周 之后。',
    });
    expect(repeatAnchorNote('{"freq":"daily","type":"flexible"}')?.text).toBe(
      '当你完成任务后，下一个任务将被安排在 1 天 之后。',
    );
  });

  it('falls back to fixed when the rule carries no anchor (legacy rows)', () => {
    expect(repeatAnchorNote('{"freq":"weekly","days":[1]}')?.key).toBe(REPEAT_FIXED_NOTE_KEY);
  });

  it('has nothing to say without a rule', () => {
    expect(repeatAnchorNote(null)).toBeNull();
    expect(repeatAnchorNote('nonsense')).toBeNull();
  });
});