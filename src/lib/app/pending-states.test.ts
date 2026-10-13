import { describe, expect, it } from 'vitest';

import {
  PENDING_STATES,
  allPendingLabels,
  isCollectedPendingLabel,
  pendingLabel,
} from './pending-states';

/**
 * The eleven asynchronous pending states (G300). Exporting and avatar updating have their own
 * lines, and two pairs differ only by number.
 */
describe('the eleven states', () => {
  it('has exactly eleven', () => {
    expect(Object.keys(PENDING_STATES)).toHaveLength(11);
    expect(allPendingLabels()).toHaveLength(11);
  });

  it('gives exporting and avatar updating their own lines', () => {
    expect(pendingLabel('exportingDocuments')).toBe('正在导出文档');
    expect(pendingLabel('updatingSpaceAvatar')).toBe('正在更新空间头像');
  });

  it('keeps the singular and plural pairs apart by key', () => {
    expect(PENDING_STATES.deletingDocument.key).toBe('alert.deleting.document');
    expect(PENDING_STATES.deletingDocuments.key).toBe('alert.deleting.documents');
    expect(PENDING_STATES.deletingInvite.key).toBe('alert.deleting.invite');
    expect(PENDING_STATES.deletingInvites.key).toBe('alert.deleting.invites');
  });
});

describe('recognising a collected sentence', () => {
  it('accepts the collected ones', () => {
    expect(isCollectedPendingLabel('正在创建文件夹')).toBe(true);
  });

  it('rejects an invented twelfth wording', () => {
    expect(isCollectedPendingLabel('正在处理')).toBe(false);
  });
});
