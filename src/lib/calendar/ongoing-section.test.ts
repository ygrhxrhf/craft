import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ONGOING_KEY, ONGOING_TITLE, ongoingTasks, pastDayKeeps } from './timeline';

const today = new Date(2026, 10, 3);

const task = (over: Record<string, unknown>) => ({
  scheduleDate: '2026-10-30T09:00:00.000Z',
  isCompleted: false,
  status: 'todo',
  ...over,
});

describe('the ongoing section (G96)', () => {
  it('collects past unfinished tasks only, oldest first', () => {
    const rows = ongoingTasks(
      [
        task({ id: 'old', scheduleDate: '2026-10-01T09:00:00.000Z' }),
        task({ id: 'new', scheduleDate: '2026-11-02T09:00:00.000Z' }),
        task({ id: 'done', isCompleted: true }),
        task({ id: 'cancelled', status: 'cancelled' }),
        task({ id: 'future', scheduleDate: '2026-11-10T09:00:00.000Z' }),
        task({ id: 'none', scheduleDate: null }),
      ] as never,
      today,
    );
    expect(rows.map((row) => (row as { id: string }).id)).toEqual(['old', 'new']);
  });

  it('keeps only finished work in past day sections', () => {
    expect(pastDayKeeps(task({}))).toBe(false);
    expect(pastDayKeeps(task({ isCompleted: true }))).toBe(true);
    expect(pastDayKeeps(task({ status: 'cancelled' }))).toBe(true);
  });

  it('takes the title from the catalog key', () => {
    expect(ONGOING_TITLE).toBe('进行中');
    expect(ONGOING_KEY).toBe('in.progress');
  });

  it('renders the section in the timeline', () => {
    const view = readFileSync(join(process.cwd(), 'src/components/calendar/CalendarTimeline.tsx'), 'utf8');
    expect(view).toContain('data-testid="calendar-section-ongoing"');
    expect(view).toContain('ongoingTasks(tasks, today)');
    expect(view).toContain('!pastDay || pastDayKeeps(task)');
  });
});
