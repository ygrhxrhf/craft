import { describe, expect, it } from 'vitest';

import { REMIND_PRESETS, isInstantPreset, remindInstantFor } from './remind-presets';

/**
 * The 「提醒我…」 submenu (G1466). Seven entries, one of which (`明天`) lives in a different i18n
 * namespace, and two of which have no computed time.
 */
describe('the submenu entries', () => {
  it('has all seven, in order', () => {
    expect(REMIND_PRESETS.map((p) => p.label)).toEqual([
      '20 分钟后',
      '1小时后',
      '3小时后',
      '明天',
      '下周',
      '留着以后用',
      '自定义…',
    ]);
  });

  it('keeps the official spacing, which is inconsistent on purpose', () => {
    // `20 分钟后` has a space; the two hour entries do not.
    expect(REMIND_PRESETS[0].label).toBe('20 分钟后');
    expect(REMIND_PRESETS[1].label).toBe('1小时后');
    expect(REMIND_PRESETS[2].label).toBe('3小时后');
  });

  it('takes 明天 from a different namespace than the rest', () => {
    const tomorrow = REMIND_PRESETS.find((p) => p.id === 'tomorrow');
    expect(tomorrow?.key).toBe('date.tomorrow');
    // Every other entry is in the reminder family.
    for (const preset of REMIND_PRESETS) {
      if (preset.id === 'tomorrow') continue;
      expect(preset.key.startsWith('commands.reminder.'), preset.id).toBe(true);
    }
  });
});

describe('which presets resolve to a time', () => {
  it('lists the five instant presets', () => {
    expect(isInstantPreset('in20min')).toBe(true);
    expect(isInstantPreset('tomorrow')).toBe(true);
    expect(isInstantPreset('nextWeek')).toBe(true);
    expect(isInstantPreset('saveForLater')).toBe(false);
    expect(isInstantPreset('custom')).toBe(false);
  });
});

describe('the computed instants', () => {
  const now = new Date(2026, 9, 14, 10, 30, 0);

  it('adds the fixed offsets for the three relative entries', () => {
    expect(remindInstantFor('in20min', now)?.getTime()).toBe(now.getTime() + 20 * 60 * 1000);
    expect(remindInstantFor('in1hour', now)?.getTime()).toBe(now.getTime() + 60 * 60 * 1000);
    expect(remindInstantFor('in3hours', now)?.getTime()).toBe(now.getTime() + 3 * 60 * 60 * 1000);
  });

  it('lands tomorrow at 09:00 local', () => {
    const tomorrow = remindInstantFor('tomorrow', now);
    expect(tomorrow?.getDate()).toBe(15);
    expect(tomorrow?.getHours()).toBe(9);
    expect(tomorrow?.getMinutes()).toBe(0);
  });

  it('lands next week seven days out at 09:00 local', () => {
    const nextWeek = remindInstantFor('nextWeek', now);
    expect(nextWeek?.getDate()).toBe(21);
    expect(nextWeek?.getHours()).toBe(9);
  });

  it('has no time for the two non-instant entries', () => {
    expect(remindInstantFor('saveForLater', now)).toBeNull();
    expect(remindInstantFor('custom', now)).toBeNull();
  });
});
