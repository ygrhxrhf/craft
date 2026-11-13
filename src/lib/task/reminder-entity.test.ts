import { describe, expect, it } from 'vitest';

import {
  buildDynamicDeeplinkToBlock,
  enrichReminder,
  isTempReminder,
  mintTempReminderId,
  reminderCompletion,
  resolveReminder,
  unresolveReminder,
  type Reminder,
} from './reminder-entity';
import { iconSentence, litIcons, TIME_ICONS, visibleIcons } from './time-icons';

/**
 * G252: reminders attach to any block, block reminders get an editing-allowed deeplink, and an
 * unknown kind is a warn — not a throw.
 */
describe('the reminder entity (G252)', () => {
  const base: Reminder = { id: 'r1', kind: 'block', blockId: 'b1', documentId: 'd1', isCompleted: false };

  it('builds a block deeplink that allows editing', () => {
    const url = buildDynamicDeeplinkToBlock({ blockId: 'b1', documentId: 'd1', editingAllowed: true });
    expect(url).toContain('blockId=b1');
    expect(url).toContain('documentId=d1');
    expect(url).toContain('editingAllowed=true');
  });

  it('enriches a block reminder with its deeplink', () => {
    const result = enrichReminder(base);
    expect(result.kind).toBe('block');
    if (result.kind === 'block') expect(result.reminder.deeplinkUrl).toContain('editingAllowed=true');
  });

  it('passes a schedule reminder through', () => {
    expect(enrichReminder({ ...base, kind: 'schedule' }).kind).toBe('schedule');
  });

  it('reports an unknown kind as a warning rather than throwing', () => {
    const result = enrichReminder({ ...base, kind: 'weird' as never });
    expect(result).toEqual({ kind: 'unknown', warning: 'Unknown reminder type' });
  });

  it('a block reminder missing its block id is unknown', () => {
    expect(enrichReminder({ ...base, blockId: undefined }).kind).toBe('unknown');
  });

  it('resolve sets completion; unresolve clears it', () => {
    expect(resolveReminder(base, 1000)).toEqual({ ...base, isCompleted: true, completionDate: 1000 });
    expect(unresolveReminder(resolveReminder(base, 1000)).completionDate).toBeUndefined();
  });

  it('keeps the reminder itself when resolving — completion does not erase the due moment', () => {
    const resolved = resolveReminder(base, 1000);
    expect(resolved.id).toBe(base.id);
    expect(resolved.blockId).toBe('b1');
    expect(resolved.documentId).toBe('d1');
  });

  it('identifies a not-yet-persisted reminder by its id prefix', () => {
    const temp = mintTempReminderId('abc');
    expect(temp).toBe('new_reminder_abc');
    expect(isTempReminder(temp)).toBe(true);
    expect(isTempReminder('r1')).toBe(false);
  });
});

/**
 * G703: the completion stamp is additive — `completionDate` lives beside the reminder moment,
 * never replacing it, and an empty/broken stamp reads back as unresolved.
 */
describe('the completion stamp (G703)', () => {
  it('maps an ISO stamp onto isCompleted + completionDate', () => {
    const iso = '2026-09-28T07:23:00.307Z';
    expect(reminderCompletion(iso)).toEqual({
      isCompleted: true,
      completionDate: Date.parse(iso),
    });
  });

  it('reads back unresolved for empty, missing and broken stamps', () => {
    for (const value of [null, undefined, '', 'not-a-date']) {
      expect(reminderCompletion(value)).toEqual({ isCompleted: false, completionDate: undefined });
    }
  });
});

describe('the three time icons (G357)', () => {
  it('names three icons', () => {
    expect(TIME_ICONS.map((i) => i.kind)).toEqual(['schedule', 'deadline', 'reminder']);
  });

  it('fills the schedule and deadline sentences, but the reminder has none', () => {
    expect(iconSentence('schedule', '明天')).toBe('预定于 明天');
    expect(iconSentence('deadline', '明天')).toBe('截止日期为 明天');
    expect(iconSentence('reminder', '明天')).toBeNull();
  });

  it('lights only the icons whose field has a value', () => {
    expect(litIcons({ schedule: '明天', deadline: null, reminder: null })).toEqual(['schedule']);
    expect(litIcons({ schedule: null, deadline: null, reminder: '10:00' })).toEqual(['reminder']);
  });

  it('floats all three on an active row even when nothing is set (V33/V37)', () => {
    expect(visibleIcons({ schedule: null, deadline: null, reminder: null, active: true })).toEqual([
      'schedule',
      'deadline',
      'reminder',
    ]);
  });

  it('hides unset icons on a resting row (V37)', () => {
    expect(visibleIcons({ schedule: null, deadline: null, reminder: null, active: false })).toEqual([]);
  });

  it('keeps the lit icon on a resting row (V42)', () => {
    expect(
      visibleIcons({ schedule: '2026-10-09T00:00:00.000Z', deadline: null, reminder: null, active: false }),
    ).toEqual(['schedule']);
  });
});
