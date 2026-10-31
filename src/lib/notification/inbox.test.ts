import { describe, expect, it } from 'vitest';

import { unreadReminders } from './inbox';

describe('unreadReminders', () => {
  it('drops the rows the user already resolved', () => {
    const rows = [
      { id: 'n1', title: '甲', isResolved: false, remindAt: '2026-10-02T09:00:00.000Z' },
      { id: 'n2', title: '乙', isResolved: true, remindAt: '2026-10-02T09:30:00.000Z' },
    ];
    expect(unreadReminders(rows).map((row) => row.id)).toEqual(['n1']);
  });

  it('orders the newest reminder first', () => {
    const rows = [
      { id: 'n1', title: '早', remindAt: '2026-10-02T08:00:00.000Z' },
      { id: 'n2', title: '晚', remindAt: '2026-10-02T09:00:00.000Z' },
    ];
    expect(unreadReminders(rows).map((row) => row.id)).toEqual(['n2', 'n1']);
  });

  it('orders correctly across the two time spellings the driver mixes in', () => {
    // "…+08" is what node-postgres hands back for a timestamptz; it is a legal
    // Date.parse input but a broken ISO one, so ordering must not treat it as junk.
    const rows = [
      { id: 'n1', title: 'ISO', remindAt: '2026-10-02T09:00:00.000Z' },
      { id: 'n2', title: '驱动串·晚', remindAt: '2026-10-02 20:00:00+08' },
      { id: 'n3', title: '驱动串·早', remindAt: '2026-10-02 08:00:00+08' },
    ];
    expect(unreadReminders(rows).map((row) => row.id)).toEqual(['n2', 'n1', 'n3']);
  });

  it('breaks a tie deterministically instead of relying on sort stability', () => {
    const at = '2026-10-02T09:00:00.000Z';
    const rows = [
      { id: 'b', title: '乙', remindAt: at },
      { id: 'a', title: '甲', remindAt: at },
    ];
    expect(unreadReminders(rows).map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('ignores a payload row with no id, which cannot be resolved anyway', () => {
    const rows = [{ title: '残缺' }, { id: 'n1', title: '甲' }];
    expect(unreadReminders(rows).map((row) => row.id)).toEqual(['n1']);
  });

  it('keeps a row whose reminder time is missing rather than hiding it', () => {
    const rows = [{ id: 'n1', title: '甲', remindAt: null }];
    expect(unreadReminders(rows)).toHaveLength(1);
  });
});

// G137: read and resolved are different axes — a read row stays in the list.
describe('read state', () => {
  it('keeps read rows and reports their readAt', () => {
    const rows = [
      { id: 'n1', title: '未读', readAt: null },
      { id: 'n2', title: '已读', readAt: '2026-10-31T09:00:00.000Z' },
    ];
    const inbox = unreadReminders(rows);
    expect(inbox.map((row) => row.id)).toEqual(['n1', 'n2']);
    expect(inbox[1].readAt).toBe('2026-10-31T09:00:00.000Z');
    expect(inbox[0].readAt).toBeNull();
  });

  it('defaults kind when the payload omits it', () => {
    expect(unreadReminders([{ id: 'n1', title: '甲' }])[0].kind).toBe('taskReminder');
  });
});
