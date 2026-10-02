import { describe, expect, it } from 'vitest';

import {
  REMINDER_LOOKBACK_MS,
  dueReminders,
  notificationKey,
  type ReminderCandidate,
} from './task-reminders';

const NOW = Date.parse('2026-10-02T10:00:00.000Z');

function candidate(overrides: Partial<ReminderCandidate> & { id: string }): ReminderCandidate {
  return {
    title: '交周报',
    remindAt: new Date(NOW - 60_000).toISOString(),
    documentId: null,
    isCompleted: false,
    status: 'todo',
    ...overrides,
  };
}

describe('dueReminders', () => {
  it('notifies a reminder whose moment just passed', () => {
    expect(dueReminders([candidate({ id: 't1' })], [], NOW)).toEqual([
      { taskId: 't1', title: '交周报', remindAt: candidate({ id: 't1' }).remindAt, documentId: null },
    ]);
  });

  it('leaves a future reminder alone', () => {
    const future = dueReminders(
      [candidate({ id: 't1', remindAt: new Date(NOW + 60_000).toISOString() })],
      [],
      NOW,
    );
    expect(future).toEqual([]);
  });

  it('drops a reminder that came due before the lookback window', () => {
    const stale = dueReminders(
      [candidate({ id: 't1', remindAt: new Date(NOW - REMINDER_LOOKBACK_MS - 1).toISOString() })],
      [],
      NOW,
    );
    expect(stale).toEqual([]);
  });

  it('keeps a reminder exactly at the window edge', () => {
    const edge = dueReminders(
      [candidate({ id: 't1', remindAt: new Date(NOW - REMINDER_LOOKBACK_MS).toISOString() })],
      [],
      NOW,
    );
    expect(edge.map((row) => row.taskId)).toEqual(['t1']);
  });

  it('stays silent for a completed task even when its reminder came due', () => {
    expect(dueReminders([candidate({ id: 't1', isCompleted: true })], [], NOW)).toEqual([]);
  });

  it('stays silent for a task whose status is done', () => {
    expect(dueReminders([candidate({ id: 't1', status: 'done' })], [], NOW)).toEqual([]);
  });

  it('does not re-notify a reminder that already has a notification', () => {
    const row = candidate({ id: 't1' });
    expect(dueReminders([row], [notificationKey('t1', row.remindAt!)], NOW)).toEqual([]);
  });

  it('matches an existing notification even when the driver spelled the time differently', () => {
    // Postgres hands timestamptz back as "2026-10-02 18:00:00+08", not the ISO
    // string that was written, so identity has to be the instant.
    const row = candidate({ id: 't1', remindAt: '2026-10-02 09:59:00+00' });
    const already = notificationKey('t1', '2026-10-02T09:59:00.000Z');
    expect(dueReminders([row], [already], NOW)).toEqual([]);
  });

  it('notifies again once the reminder moment is moved', () => {
    const first = candidate({ id: 't1', remindAt: new Date(NOW - 2 * 60_000).toISOString() });
    const moved = { ...first, remindAt: new Date(NOW - 60_000).toISOString() };
    expect(dueReminders([moved], [notificationKey('t1', first.remindAt!)], NOW)).toHaveLength(1);
  });

  it('carries the document along so a trashed source can be filtered by the caller', () => {
    const withDoc = candidate({ id: 't1', documentId: 'doc-9' });
    expect(dueReminders([withDoc], [], NOW)[0]).toMatchObject({ documentId: 'doc-9' });
  });

  it('ignores an unparsable reminder time instead of throwing', () => {
    const junk = dueReminders([candidate({ id: 't1', remindAt: 'not-a-date' })], [], NOW);
    expect(junk).toEqual([]);
  });

  it('ignores a task with no reminder set', () => {
    expect(dueReminders([candidate({ id: 't1', remindAt: null })], [], NOW)).toEqual([]);
  });
});
