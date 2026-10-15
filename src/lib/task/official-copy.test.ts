import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  TASK_GROUP_KEYS,
  TASK_GROUP_LABELS,
  TASKS_ADD_TASK,
  TASKS_ADD_TASK_KEY,
  TASKS_INBOX_EMPTY,
  TASKS_INBOX_EMPTY_KEY,
  TASK_VIEW_EMPTY,
  TASK_VIEW_EMPTY_KEYS,
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
});
