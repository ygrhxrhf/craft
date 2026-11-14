import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_TASK_VIEW_SETTINGS,
  TASK_VIEW_SETTING_VALIDATORS,
  TASK_VIEW_SETTINGS_DEFAULTS_VERSION,
  TASK_VIEW_SETTINGS_STORAGE_KEY,
  applyTaskViewFilters,
  canReorderTasks,
  filterInboxScheduled,
  isValidTaskViewSettings,
  matchesTodayView,
  migrateTaskViewSettings,
  readTaskViewSettings,
  resetTaskViewSettingsCache,
  serverTaskViewSettings,
  sortTasksForView,
  subscribeTaskViewSettings,
  writeTaskViewSetting,
  writeTaskViewSettings,
} from './task-view-settings';

describe('the official taskViewSettings layer (G604)', () => {
  const store = new Map<string, string>();
  const fakeStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };

  beforeEach(() => {
    store.clear();
    resetTaskViewSettingsCache();
    (globalThis as { localStorage?: unknown }).localStorage = fakeStorage;
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('starts from the ten official defaults, under the official storage key', () => {
    expect(TASK_VIEW_SETTINGS_STORAGE_KEY).toBe('taskViewSettings');
    expect(DEFAULT_TASK_VIEW_SETTINGS).toEqual({
      inboxShowScheduledTasks: true,
      inboxTaskSort: 'schedule',
      todayShowPastDueTasks: true,
      todaySortAscending: true,
      todaySortProperty: 'modified',
      todayTaskSort: 'schedule',
      upcomingGroupBy: 'schedule',
      upcomingDocumentSort: 'modified',
      upcomingTaskSort: 'schedule',
      defaultsVersion: 1,
    });
    expect(serverTaskViewSettings()).toEqual(DEFAULT_TASK_VIEW_SETTINGS);
    expect(readTaskViewSettings()).toEqual(DEFAULT_TASK_VIEW_SETTINGS);
  });

  it('merges a patch over what is stored now, not over a stale snapshot', () => {
    writeTaskViewSetting('inboxShowScheduledTasks', false);
    writeTaskViewSetting('upcomingGroupBy', 'document');
    const stored = JSON.parse(store.get(TASK_VIEW_SETTINGS_STORAGE_KEY) as string);
    expect(stored.inboxShowScheduledTasks).toBe(false);
    expect(stored.upcomingGroupBy).toBe('document');
    expect(stored.todaySortProperty).toBe('modified');
  });

  it('notifies subscribers and hands back a stable snapshot between writes', () => {
    let calls = 0;
    const off = subscribeTaskViewSettings(() => {
      calls += 1;
    });
    const before = readTaskViewSettings();
    expect(readTaskViewSettings()).toBe(before);
    writeTaskViewSettings({ inboxTaskSort: 'manual' });
    expect(calls).toBe(1);
    expect(readTaskViewSettings().inboxTaskSort).toBe('manual');
    off();
  });

  it('rejects a row that is not one of the sort options for that list', () => {
    // 手动的 only exists in the inbox (`La = [...Js, "manual"]`); 今天/即将进行 are 安排|截止.
    expect(TASK_VIEW_SETTING_VALIDATORS.todayTaskSort('manual')).toBe(false);
    expect(TASK_VIEW_SETTING_VALIDATORS.upcomingTaskSort('manual')).toBe(false);
    expect(TASK_VIEW_SETTING_VALIDATORS.inboxTaskSort('manual')).toBe(true);
  });

  it('treats one bad field as bad settings overall (va)', () => {
    expect(isValidTaskViewSettings(DEFAULT_TASK_VIEW_SETTINGS)).toBe(true);
    expect(isValidTaskViewSettings({ ...DEFAULT_TASK_VIEW_SETTINGS, inboxTaskSort: 'deadline' })).toBe(
      true,
    );
    expect(isValidTaskViewSettings({ ...DEFAULT_TASK_VIEW_SETTINGS, todaySortProperty: 'size' })).toBe(
      false,
    );
    expect(isValidTaskViewSettings({ ...DEFAULT_TASK_VIEW_SETTINGS, defaultsVersion: 2 })).toBe(false);
    expect(isValidTaskViewSettings(null)).toBe(false);
  });

  it('folds an unreadable or partial object onto the defaults (Pa)', () => {
    expect(migrateTaskViewSettings(null)).toEqual(DEFAULT_TASK_VIEW_SETTINGS);
    expect(migrateTaskViewSettings('nope')).toEqual(DEFAULT_TASK_VIEW_SETTINGS);
    expect(migrateTaskViewSettings({ inboxTaskSort: 'manual' })).toEqual({
      ...DEFAULT_TASK_VIEW_SETTINGS,
      inboxTaskSort: 'manual',
    });
    expect(migrateTaskViewSettings({ todayTaskSort: 'manual' }).todayTaskSort).toBe('schedule');
  });

  it('an older defaultsVersion forfeits the two fields whose meaning changed', () => {
    const old = migrateTaskViewSettings({
      defaultsVersion: 0,
      inboxShowScheduledTasks: false,
      todaySortProperty: 'created',
      inboxTaskSort: 'deadline',
    });
    expect(old.defaultsVersion).toBe(TASK_VIEW_SETTINGS_DEFAULTS_VERSION);
    expect(old.inboxShowScheduledTasks).toBe(true);
    expect(old.todaySortProperty).toBe('modified');
    expect(old.inboxTaskSort).toBe('deadline');
  });

  it('reads a corrupt stored blob as the defaults instead of throwing', () => {
    store.set(TASK_VIEW_SETTINGS_STORAGE_KEY, '{not json');
    expect(readTaskViewSettings()).toEqual(DEFAULT_TASK_VIEW_SETTINGS);
  });
});

describe('the settings drive the list itself (G604)', () => {
  const task = (id: string, scheduleDate: string | null, extra: Record<string, unknown> = {}) => ({
    id,
    title: id,
    scheduleDate,
    dueDate: null as string | null,
    ...extra,
  });
  const now = new Date(2026, 9, 14, 12, 0);
  const at = (day: number, h = 9) => new Date(2026, 9, day, h).toISOString();

  it('「显示计划任务」 off keeps only rows with no schedule (Wa)', () => {
    const rows = [task('a', at(20)), task('b', null)];
    expect(filterInboxScheduled(rows, true).map((row) => row.id)).toEqual(['a', 'b']);
    expect(filterInboxScheduled(rows, false).map((row) => row.id)).toEqual(['b']);
  });

  it('「显示过去日期」 decides whether overdue joins 今天', () => {
    const overdue = { id: 'o', scheduleDate: at(10), dueDate: null };
    const today = { id: 't', scheduleDate: at(14, 0), dueDate: null };
    const future = { id: 'f', scheduleDate: at(15, 6), dueDate: null };
    // 23:00 local today still counts; tomorrow 00:01 does not.
    const lateToday = { id: 'l', scheduleDate: at(14, 23), dueDate: null };
    expect(matchesTodayView(overdue, true, now)).toBe(true);
    expect(matchesTodayView(overdue, false, now)).toBe(false);
    expect(matchesTodayView(today, false, now)).toBe(true);
    expect(matchesTodayView(lateToday, false, now)).toBe(true);
    expect(matchesTodayView(future, true, now)).toBe(false);
    expect(matchesTodayView(future, false, now)).toBe(false);
  });

  it('falls back to the deadline when there is no schedule (Od/Ad)', () => {
    const deadlineOnly = { id: 'd', scheduleDate: null, dueDate: at(14, 18) };
    expect(matchesTodayView(deadlineOnly, false, now)).toBe(true);
    expect(matchesTodayView(deadlineOnly, true, now)).toBe(true);
  });

  it('ignores rows with neither date', () => {
    expect(matchesTodayView({ scheduleDate: null, dueDate: null }, true, now)).toBe(false);
  });

  it('sorts by 安排 / 截止日期 with empty values last', () => {
    const rows = [task('n', null), task('late', at(20)), task('early', at(15))];
    expect(sortTasksForView(rows, 'schedule').map((row) => row.id)).toEqual(['early', 'late', 'n']);
    const due = [
      { id: 'n', scheduleDate: null, dueDate: null },
      { id: 'b', scheduleDate: null, dueDate: at(20) },
      { id: 'a', scheduleDate: null, dueDate: at(16) },
    ];
    expect(sortTasksForView(due, 'deadline').map((row) => row.id)).toEqual(['a', 'b', 'n']);
  });

  it('手动的 follows the renumbered order column, not the dates', () => {
    const rows = [
      task('second', at(15), { order: 1 }),
      task('first', at(20), { order: 0 }),
      task('undragged', null, { order: null }),
    ];
    // A row that was never dragged has no order; it ties with order 0 and keeps page order.
    expect(sortTasksForView(rows, 'manual').map((row) => row.id)).toEqual([
      'first',
      'undragged',
      'second',
    ]);
  });

  it('only 手动的 allows dropping a row, which is the refusal gate (Ki)', () => {
    expect(canReorderTasks('manual')).toBe(true);
    expect(canReorderTasks('schedule')).toBe(false);
    expect(canReorderTasks('deadline')).toBe(false);
  });

  it('the filter menu rows exclude daily notes and pinned documents when unchecked', () => {
    const rows = [
      { documentId: 'd1', isDailyNote: true },
      { documentId: 'd2', isDailyNote: false },
      { documentId: null },
    ];
    const pinned = new Set(['d2']);
    expect(applyTaskViewFilters(rows, { excludeDailyNotes: false, excludePinned: false })).toHaveLength(
      3,
    );
    expect(applyTaskViewFilters(rows, { excludeDailyNotes: true, excludePinned: false })).toHaveLength(
      2,
    );
    expect(
      applyTaskViewFilters(rows, { excludeDailyNotes: true, excludePinned: true }, pinned),
    ).toEqual([{ documentId: null }]);
  });
});
