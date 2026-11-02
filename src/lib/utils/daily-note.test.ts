import { describe, expect, it } from 'vitest';

import { dailyNoteDisplayTitle, dailyNoteTitle } from './daily-note';

// G356: a daily note's title is derived from its date at render time, not frozen at creation.
describe('daily note display title (G356)', () => {
  it('derives from dailyNoteDate', () => {
    const date = new Date(2026, 9, 9);
    expect(
      dailyNoteDisplayTitle({ isDailyNote: true, dailyNoteDate: date.toISOString(), title: '旧标题' }),
    ).toBe(dailyNoteTitle(date));
  });

  it('falls back to the stored title when there is no usable date', () => {
    expect(dailyNoteDisplayTitle({ isDailyNote: true, dailyNoteDate: null, title: '存下的' })).toBe('存下的');
    expect(dailyNoteDisplayTitle({ isDailyNote: true, dailyNoteDate: 'bad', title: '存下的' })).toBe('存下的');
  });

  it('leaves ordinary documents alone', () => {
    expect(dailyNoteDisplayTitle({ isDailyNote: false, dailyNoteDate: null, title: '普通文档' })).toBe('普通文档');
  });
});
