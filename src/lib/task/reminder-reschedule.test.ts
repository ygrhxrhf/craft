import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  RESCHEDULE_CONFIRM_LABEL,
  RESCHEDULE_REMINDER_DESC,
  RESCHEDULE_REMINDER_TITLE,
  needsRescheduleConfirm,
} from './reminder-reschedule';

/**
 * `gap.md` G87 —— 带到期提醒的块改期要先确认。官方逐字（`i18n-zh.tsv:236-237`／
 * `dialogs.md:77`）：「此区块有一个即将到期的提醒。」／「请确认你是否要更改。」
 */
describe('带到期提醒的块改期要先确认（G87）', () => {
  it('官方文案逐字', () => {
    expect(RESCHEDULE_REMINDER_TITLE).toBe('此区块有一个即将到期的提醒。');
    expect(RESCHEDULE_REMINDER_DESC).toBe('请确认你是否要更改。');
    expect(RESCHEDULE_CONFIRM_LABEL).toBe('更改');
  });

  it('提醒在未来 ⇒ 要拦', () => {
    const now = new Date('2026-10-15T10:00:00.000Z');
    expect(needsRescheduleConfirm('2026-10-15T11:00:00.000Z', now)).toBe(true);
  });

  it('提醒已过期 ⇒ 不拦（官方说的是 upcoming reminder）', () => {
    const now = new Date('2026-10-15T10:00:00.000Z');
    expect(needsRescheduleConfirm('2026-10-15T09:00:00.000Z', now)).toBe(false);
    expect(needsRescheduleConfirm('2026-10-15T10:00:00.000Z', now)).toBe(false);
  });

  it('没有提醒／空值／坏值 ⇒ 不拦', () => {
    const now = new Date('2026-10-15T10:00:00.000Z');
    expect(needsRescheduleConfirm(null, now)).toBe(false);
    expect(needsRescheduleConfirm(undefined, now)).toBe(false);
    expect(needsRescheduleConfirm('', now)).toBe(false);
    expect(needsRescheduleConfirm('not-a-date', now)).toBe(false);
    expect(needsRescheduleConfirm(12345, now)).toBe(false);
  });

  it('接线：改期那一路确实先过判据再开七档（不是只定义了常量）', () => {
    const src = readFileSync(
      path.resolve('src/components/editor/extensions/reminder-pill.ts'),
      'utf8',
    );
    expect(src, 'reminder-pill 没有用判据').toContain('needsRescheduleConfirm(current)');
    expect(src, 'reminder-pill 没有弹确认框').toContain('confirmDialog(');
    expect(src, '确认后没有再开七档').toMatch(/confirmed[\s\S]*?openPresetMenu/);
  });
});
