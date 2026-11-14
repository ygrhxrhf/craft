import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  TASK_DOCUMENT_SORT_CREATED,
  TASK_DOCUMENT_SORT_CREATED_KEY,
  TASK_DOCUMENT_SORT_NAME,
  TASK_DOCUMENT_SORT_NAME_KEY,
  TASK_DOCUMENT_SORT_UPDATED,
  TASK_DOCUMENT_SORT_UPDATED_KEY,
  TASK_GROUP_BY_LABEL,
  TASK_GROUP_BY_LABEL_KEY,
  TASK_GROUP_BY_DEADLINE,
  TASK_GROUP_BY_DEADLINE_KEY,
  TASK_GROUP_BY_DOCUMENT,
  TASK_GROUP_BY_DOCUMENT_KEY,
  TASK_GROUP_BY_SCHEDULE,
  TASK_GROUP_BY_SCHEDULE_KEY,
  TASK_GROUP_KEYS,
  TASK_GROUP_LABELS,
  TASK_INBOX_SORT_BY_LABEL,
  TASK_INBOX_SORT_BY_LABEL_KEY,
  TASK_MORE_OPTIONS,
  TASK_MORE_OPTIONS_KEY,
  TASK_NO_DEADLINE,
  TASK_NO_DEADLINE_KEY,
  TASK_REORDER_REFUSED_TEMPLATE,
  TASK_REORDER_SORT_LABELS,
  TASK_SHOW_DAILY_NOTES,
  TASK_SHOW_DAILY_NOTES_KEY,
  TASK_SHOW_PAST_DATES,
  TASK_SHOW_PAST_DATES_KEY,
  TASK_SHOW_PINNED,
  TASK_SHOW_PINNED_KEY,
  TASK_SHOW_SCHEDULED,
  TASK_SHOW_SCHEDULED_KEY,
  TASK_SORT_BY_LABEL,
  TASK_SORT_BY_LABEL_KEY,
  TASK_SORT_DOCUMENTS_BY,
  TASK_SORT_DOCUMENTS_BY_KEY,
  TASK_SORT_MANUAL,
  TASK_SORT_MANUAL_KEY,
  TASK_SORT_TASKS_BY,
  TASKS_ADD_TASK,
  TASKS_ADD_TASK_KEY,
  TASKS_INBOX_EMPTY,
  TASKS_INBOX_EMPTY_KEY,
  TASK_VIEW_COMPLETED,
  TASK_VIEW_COMPLETED_KEY,
  TASK_VIEW_EMPTY,
  TASK_VIEW_EMPTY_KEYS,
  taskReorderRefusedTitle,
} from './official-copy';

/**
 * Ledger-as-source, the same move `accent-tokens.test.ts` makes: `feature-catalog.md` holds each
 * key as `- 中文串 `key`  _English_`, so the assertion reads the collected text rather than a
 * second string I typed — a typo in the component can then only come from the component.
 */
const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('the tasks page copy is the collected official text', () => {
  it.each(Object.entries(TASK_GROUP_KEYS))('%s group label matches %s in the ledger', (group, key) => {
    expect(ledgerValue(key)).toBe(TASK_GROUP_LABELS[group as keyof typeof TASK_GROUP_LABELS]);
  });

  it('the inbox empty state matches tasks.inbox.empty', () => {
    expect(ledgerValue(TASKS_INBOX_EMPTY_KEY)).toBe(TASKS_INBOX_EMPTY);
  });

  it('the empty-state button matches tasks.add.task', () => {
    expect(ledgerValue(TASKS_ADD_TASK_KEY)).toBe(TASKS_ADD_TASK);
  });

  /**
   * G262: each of the four views has its own zero-state sentence — one shared line would erase the
   * distinction between "nothing here" and "all done".
   */
  it.each(Object.entries(TASK_VIEW_EMPTY_KEYS))(
    'the %s view empty state matches %s in the ledger',
    (view, key) => {
      expect(ledgerValue(key)).toBe(TASK_VIEW_EMPTY[view as keyof typeof TASK_VIEW_EMPTY]);
    },
  );

  it('the four view sentences are all different', () => {
    const lines = Object.values(TASK_VIEW_EMPTY);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('fails loudly when the ledger does not contain a key at all', () => {
    // Guards the extractor itself: a missing key must read as null, not as some other line.
    expect(ledgerValue('tasks.definitely.not.a.key')).toBeNull();
  });

  /**
   * G604: the sort/filter menu rows. Sixteen keys are collected zh-Hans copy; the seven keys the
   * official zh-Hans bundle lacks (`tasks.schedule.date`, `tasks.deadline.date`,
   * `tasks.sort.tasks.by`, `tasks.sort.documents.by`, `tasks.no.deadline`,
   * `tasks.reordering.not.allowed.sorted.by.x`, `tasks.switch.to.manual`) deliberately stay English
   * and therefore have no ledger line to compare against.
   */
  it.each([
    [TASK_MORE_OPTIONS, TASK_MORE_OPTIONS_KEY],
    [TASK_SORT_BY_LABEL, TASK_SORT_BY_LABEL_KEY],
    [TASK_SORT_MANUAL, TASK_SORT_MANUAL_KEY],
    [TASK_INBOX_SORT_BY_LABEL, TASK_INBOX_SORT_BY_LABEL_KEY],
    [TASK_VIEW_COMPLETED, TASK_VIEW_COMPLETED_KEY],
    [TASK_GROUP_BY_LABEL, TASK_GROUP_BY_LABEL_KEY],
    [TASK_GROUP_BY_SCHEDULE, TASK_GROUP_BY_SCHEDULE_KEY],
    [TASK_GROUP_BY_DEADLINE, TASK_GROUP_BY_DEADLINE_KEY],
    [TASK_GROUP_BY_DOCUMENT, TASK_GROUP_BY_DOCUMENT_KEY],
    [TASK_DOCUMENT_SORT_NAME, TASK_DOCUMENT_SORT_NAME_KEY],
    [TASK_DOCUMENT_SORT_UPDATED, TASK_DOCUMENT_SORT_UPDATED_KEY],
    [TASK_DOCUMENT_SORT_CREATED, TASK_DOCUMENT_SORT_CREATED_KEY],
    [TASK_SHOW_SCHEDULED, TASK_SHOW_SCHEDULED_KEY],
    [TASK_SHOW_PAST_DATES, TASK_SHOW_PAST_DATES_KEY],
    [TASK_SHOW_DAILY_NOTES, TASK_SHOW_DAILY_NOTES_KEY],
    [TASK_SHOW_PINNED, TASK_SHOW_PINNED_KEY],
  ])('%s matches its ledger key', (value, key) => {
    expect(ledgerValue(key)).toBe(value);
  });

  it('keeps the seven zh-Hans gaps in the official English fallback', () => {
    for (const key of [
      'tasks.schedule.date',
      'tasks.deadline.date',
      'tasks.sort.tasks.by',
      'tasks.sort.documents.by',
      'tasks.no.deadline',
      'tasks.reordering.not.allowed.sorted.by.x',
      'tasks.switch.to.manual',
    ]) {
      expect(ledgerValue(key)).toBeNull();
    }
    expect(TASK_SORT_TASKS_BY).toBe('Sort Tasks By');
    expect(TASK_SORT_DOCUMENTS_BY).toBe('Sort Documents By');
    expect(TASK_SORT_DOCUMENTS_BY_KEY).toBe('tasks.sort.documents.by');
    expect(TASK_NO_DEADLINE).toBe('No Deadline');
    expect(TASK_NO_DEADLINE_KEY).toBe('tasks.no.deadline');
  });

  it('fills the refusal template with the translated sort name, not the key', () => {
    expect(TASK_REORDER_REFUSED_TEMPLATE).toContain('[0]');
    expect(taskReorderRefusedTitle('deadline')).toBe(
      TASK_REORDER_REFUSED_TEMPLATE.replace('[0]', TASK_REORDER_SORT_LABELS.deadline),
    );
    expect(taskReorderRefusedTitle('schedule')).toContain('安排');
    expect(taskReorderRefusedTitle('deadline')).toContain('截止日期');
  });
});
