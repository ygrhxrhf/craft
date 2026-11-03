import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { bulkCheckCandidates, bulkCheckLabel, bulkCheckTargets } from './bulk-check';

function tasks(...states: Array<boolean | 'cancelled'>) {
  return states.map((state, index) => ({
    id: `t${index + 1}`,
    isCompleted: state === true,
    status: state === 'cancelled' ? 'cancelled' : 'todo',
  }));
}

describe('the task bulk check (G106)', () => {
  it('completes only the unchecked rows when any row is still open', () => {
    expect(bulkCheckTargets(tasks(false, true, false)).map((task) => task.id)).toEqual([
      't1',
      't3',
    ]);
    expect(bulkCheckLabel(tasks(false, true, false))).toBe('全部完成');
  });

  it('unchecks every row once all of them are checked', () => {
    expect(bulkCheckTargets(tasks(true, true)).map((task) => task.id)).toEqual(['t1', 't2']);
    expect(bulkCheckLabel(tasks(true, true))).toBe('全部取消勾选');
  });

  it('leaves cancelled rows out of both directions', () => {
    expect(bulkCheckCandidates(tasks(true, 'cancelled')).map((task) => task.id)).toEqual(['t1']);
    expect(bulkCheckTargets(tasks(true, 'cancelled')).map((task) => task.id)).toEqual(['t1']);
    expect(bulkCheckTargets(tasks(false, 'cancelled')).map((task) => task.id)).toEqual(['t1']);
  });

  it('has nothing to do on an empty list', () => {
    expect(bulkCheckTargets([])).toEqual([]);
    expect(bulkCheckLabel([])).toBe('全部取消勾选');
  });

  it('is mounted on the task list, driven by the visible rows', () => {
    const view = readFileSync(
      new URL('../../app/(app)/tasks/TasksView.tsx', import.meta.url),
      'utf8',
    );
    expect(view).toContain('bulkCheckTargets(visible)');
    expect(view).toContain('{bulkCheckLabel(visible)}');
    expect(view).toContain('void handleBulkCheck()');
  });
});
