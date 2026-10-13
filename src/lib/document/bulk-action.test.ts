import { describe, expect, it } from 'vitest';

import { bulkDeleteAlert, bulkRestoreAlert, runBulkAction } from './bulk-action';

/**
 * G88: the difference is not the wording, it is *which ids get attempted*. The old loop stopped at
 * the first rejection, so the assertion that matters is that a later id still runs after an
 * earlier one fails — and that the alert the user sees is keyed off how much failed.
 */
describe('runBulkAction', () => {
  it('attempts every id even when an earlier one rejects', async () => {
    const attempted: string[] = [];
    const outcome = await runBulkAction(['a', 'b', 'c'], async (id) => {
      attempted.push(id);
      if (id === 'b') throw new Error('不属于你');
    });
    expect(attempted).toEqual(['a', 'b', 'c']);
    expect(outcome.succeeded).toEqual(['a', 'c']);
    expect(outcome.failed).toEqual([{ id: 'b', message: '不属于你' }]);
  });

  it('reports a clean run as no failures', async () => {
    const outcome = await runBulkAction(['a', 'b'], async () => {});
    expect(outcome.failed).toEqual([]);
    expect(outcome.succeeded).toEqual(['a', 'b']);
  });

  it('falls back to local wording only when the error carries no message', async () => {
    const outcome = await runBulkAction(['a'], async () => {
      throw 'boom';
    });
    expect(outcome.failed).toEqual([{ id: 'a', message: '操作失败' }]);
  });
});

describe('the official alert copy', () => {
  it('separates "some" from "everything" on the delete path', () => {
    expect(bulkDeleteAlert(0, 3)).toBeNull();
    expect(bulkDeleteAlert(1, 3)).toBe('无法删除某些文档');
    expect(bulkDeleteAlert(3, 3)).toBe('无法删除文档');
  });

  it('uses the single official restore key for any failure count', () => {
    expect(bulkRestoreAlert(0)).toBeNull();
    expect(bulkRestoreAlert(1)).toBe('无法从最近删除中恢复文档');
    expect(bulkRestoreAlert(3)).toBe('无法从最近删除中恢复文档');
  });
});
