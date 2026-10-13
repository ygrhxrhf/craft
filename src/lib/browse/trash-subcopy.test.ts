import { describe, expect, it } from 'vitest';

import {
  COULD_NOT_DELETE_DOCUMENT,
  COULD_NOT_RESTORE_FROM_TRASH,
  EMPTY_TRASH_CONFIRM,
  MOVE_ITEMS_TO_TRASH,
  MOVE_ITEM_TO_TRASH,
  TRASH_RETENTION_DAYS,
  isWithinRetention,
  moveToTrashConfirm,
} from './trash-subcopy';

/**
 * The 「最近删除」 subsystem (G233): 30-day retention, a permanent-delete confirmation, and two
 * distinct failure sentences.
 */
describe('retention', () => {
  it('is 30 days', () => {
    expect(TRASH_RETENTION_DAYS).toBe(30);
  });

  it('keeps a document inside the window and drops it past the edge', () => {
    const now = Date.parse('2026-10-14T00:00:00.000Z');
    const dayMs = 24 * 60 * 60 * 1000;
    expect(isWithinRetention(new Date(now - 29 * dayMs).toISOString(), now)).toBe(true);
    expect(isWithinRetention(new Date(now - 31 * dayMs).toISOString(), now)).toBe(false);
  });

  it('treats a missing or unparsable date as not retained', () => {
    expect(isWithinRetention(null)).toBe(false);
    expect(isWithinRetention('不是时间')).toBe(false);
  });
});

describe('the empty-trash confirmation', () => {
  it('is a permanent-delete question, verbatim', () => {
    expect(EMPTY_TRASH_CONFIRM).toBe('你确定要永久删除这些项目吗？');
  });
});

describe('the two failure sentences are distinct', () => {
  it('has one for delete and one for restore', () => {
    expect(COULD_NOT_DELETE_DOCUMENT).toBe('无法删除文档');
    expect(COULD_NOT_RESTORE_FROM_TRASH).toBe('无法从最近删除中恢复文档');
    expect(COULD_NOT_DELETE_DOCUMENT).not.toBe(COULD_NOT_RESTORE_FROM_TRASH);
  });
});

describe('the move confirmation splits by count', () => {
  it('uses the singular line for one and the plural otherwise', () => {
    expect(moveToTrashConfirm(1)).toBe(MOVE_ITEM_TO_TRASH);
    expect(moveToTrashConfirm(2)).toBe(MOVE_ITEMS_TO_TRASH);
    expect(moveToTrashConfirm(0)).toBe(MOVE_ITEMS_TO_TRASH);
  });
});
