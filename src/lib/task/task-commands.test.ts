import { describe, expect, it } from 'vitest';

import { commandsForField, hasDynamicCommand, isAsymmetric, TASK_DATE_COMMANDS } from './task-commands';
import { clearedReminder, instantForSlot, showsClearRow, SLOTS_PER_DAY, slotIndexForTime, timeSlots } from './time-menu';
import { hasRemaining, remainingItems, SERIES_OPS, type SeriesItem } from './series-ops';

/**
 * G253: the two task-date command groups are parallel but asymmetric — schedule has a dynamic
 * phrase, deadline does not.
 */
describe('the task date command groups (G253)', () => {
  it('has both groups', () => {
    expect(commandsForField('schedule').length).toBeGreaterThan(0);
    expect(commandsForField('deadline').length).toBeGreaterThan(0);
  });

  it('gives schedule a dynamic phrase and deadline none', () => {
    expect(hasDynamicCommand('schedule')).toBe(true);
    expect(hasDynamicCommand('deadline')).toBe(false);
    expect(isAsymmetric()).toBe(true);
  });

  it('names the dynamic phrase verbatim', () => {
    const dynamic = TASK_DATE_COMMANDS.find((c) => c.dynamic);
    expect(dynamic?.id).toBe('commands.task.schedule.x');
    expect(dynamic?.label).toBe('安排到 [0]');
  });
});

/**
 * G411: the 96-slot, 15-minute-step time menu.
 */
describe('the 96-slot time menu (G411)', () => {
  it('has 96 slots at 15-minute steps', () => {
    expect(SLOTS_PER_DAY).toBe(96);
    const slots = timeSlots();
    expect(slots).toHaveLength(96);
    expect(slots[0].label).toBe('00:00');
    expect(slots[1].label).toBe('00:15');
    expect(slots[95].label).toBe('23:45');
  });

  it('scrolls to the slot of the current time, floored', () => {
    const at = new Date(2026, 0, 1, 10, 7);
    expect(slotIndexForTime(at)).toBe(40); // 10:00 = slot 40
    expect(timeSlots()[slotIndexForTime(at)].label).toBe('10:00');
  });

  it('round-trips a slot back to an instant on the same day', () => {
    const day = new Date(2026, 0, 1, 10, 7);
    const instant = instantForSlot(day, 42); // 10:30
    expect(instant.getHours()).toBe(10);
    expect(instant.getMinutes()).toBe(30);
    expect(instant.getDate()).toBe(1);
  });

  it('clears by disabling and dropping the offset, not by setting midnight', () => {
    expect(clearedReminder()).toEqual({ enabled: false, dateOffset: undefined });
  });

  it('shows the "no reminder" row only when one is set', () => {
    expect(showsClearRow({ enabled: true, dateOffset: 0 })).toBe(true);
    expect(showsClearRow({ enabled: false, dateOffset: undefined })).toBe(false);
    expect(showsClearRow(null)).toBe(false);
  });
});

/**
 * G260: the five series batch operations and what "remaining" means.
 */
describe('series batch operations (G260)', () => {
  const item = (over: Partial<SeriesItem>): SeriesItem => ({
    blockId: 'b',
    rootTaskBlockId: 'root',
    occurrenceIndex: 0,
    done: false,
    ...over,
  });

  it('names the five operations', () => {
    expect(SERIES_OPS.map((o) => o.id)).toEqual([
      'completeRemaining',
      'cancelRemaining',
      'deleteRemaining',
      'moveRemaining',
      'reschedule',
    ]);
    expect(SERIES_OPS.map((o) => o.label)).toContain('删除剩余');
  });

  it('takes only later, unfinished items of the same series', () => {
    const items: SeriesItem[] = [
      item({ blockId: 'a', occurrenceIndex: 0, done: true }),
      item({ blockId: 'b', occurrenceIndex: 1 }),
      item({ blockId: 'c', occurrenceIndex: 2, done: true }),
      item({ blockId: 'd', occurrenceIndex: 3 }),
      item({ blockId: 'e', rootTaskBlockId: 'other', occurrenceIndex: 4 }),
    ];
    const from = items[1];
    expect(remainingItems(items, from).map((i) => i.blockId)).toEqual(['d']);
    expect(hasRemaining(items, from)).toBe(true);
  });

  it('has no remaining items at the tail', () => {
    const items: SeriesItem[] = [item({ blockId: 'a', occurrenceIndex: 0 }), item({ blockId: 'b', occurrenceIndex: 1 })];
    expect(hasRemaining(items, items[1])).toBe(false);
  });
});
