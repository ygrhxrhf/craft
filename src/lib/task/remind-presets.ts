/**
 * The 「提醒我…」 submenu (G1466). Seven entries, verbatim, and the relative instant each one
 * means. Two details are easy to get wrong:
 *
 * - The official spacing is inconsistent: `20 分钟后` has a space, `1小时后` and `3小时后` do not.
 *   That is the collected text, not a typo to normalise.
 * - `明天` is not in the `commands.reminder.*` family at all — the value only matches `date.tomorrow`
 *   and `calendar.date.tomorrow`, so a menu generated from the reminder family alone loses it.
 */

export type RemindPresetId =
  | 'in20min'
  | 'in1hour'
  | 'in3hours'
  | 'tomorrow'
  | 'nextWeek'
  | 'saveForLater'
  | 'custom';

export interface RemindPreset {
  id: RemindPresetId;
  label: string;
  /** The i18n key the label is taken from, verbatim. */
  key: string;
}

export const REMIND_PRESETS: readonly RemindPreset[] = [
  { id: 'in20min', label: '20 分钟后', key: 'commands.reminder.20.min' },
  { id: 'in1hour', label: '1小时后', key: 'commands.reminder.1.hour' },
  { id: 'in3hours', label: '3小时后', key: 'commands.reminder.3.hour' },
  // Cross-namespace: this one is not in the reminder family.
  { id: 'tomorrow', label: '明天', key: 'date.tomorrow' },
  { id: 'nextWeek', label: '下周', key: 'commands.reminder.next.week' },
  { id: 'saveForLater', label: '留着以后用', key: 'commands.reminder.save.for.later' },
  { id: 'custom', label: '自定义…', key: 'commands.reminder.custom' },
] as const;

/** The presets that resolve to a concrete time; `saveForLater` and `custom` do not. */
export function isInstantPreset(id: RemindPresetId): boolean {
  return id === 'in20min' || id === 'in1hour' || id === 'in3hours' || id === 'tomorrow' || id === 'nextWeek';
}

/** Start of the next local day. */
function startOfNextDay(now: Date): Date {
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
}

/**
 * G651: `next_week` is **next Monday** at 09:00 (`y0(A4(Qo()), 9)`), not the same weekday a week
 * later — the official quick picks anchor on the week, and every day-granularity pick lands at
 * 09:00 local.
 */
function startOfNextWeek(now: Date): Date {
  const next = new Date(now);
  // Monday-based week offset: Monday 0 … Sunday 6.
  const mondayOffset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() + (7 - mondayOffset));
  next.setHours(9, 0, 0, 0);
  return next;
}

/**
 * The instant a preset means, relative to `now`. `saveForLater` and `custom` have no computed
 * time and return null. `tomorrow` and `nextWeek` land at 09:00 local, which is the ordinary
 * reading of a day-granularity choice.
 */
export function remindInstantFor(id: RemindPresetId, now: Date): Date | null {
  switch (id) {
    case 'in20min':
      return new Date(now.getTime() + 20 * 60 * 1000);
    case 'in1hour':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case 'in3hours':
      return new Date(now.getTime() + 3 * 60 * 60 * 1000);
    case 'tomorrow':
      return startOfNextDay(now);
    case 'nextWeek':
      return startOfNextWeek(now);
    case 'saveForLater':
    case 'custom':
      return null;
  }
}
