import { describe, expect, it } from 'vitest';

import {
  LINK_OPERATION_DONE,
  LINK_OPERATION_PENDING,
  linkOperationDone,
  linkOperationPending,
} from './link-operation-copy';

/**
 * G139: each link write carries its own present-continuous line, not a shared spinner, and the
 * completion line changes with the operation. All wording is verbatim from the pack.
 */
describe('the in-progress lines name their operation', () => {
  it('has one per operation, verbatim', () => {
    expect(linkOperationPending('updatingLink')).toBe('正在更新链接');
    expect(linkOperationPending('updatingPassword')).toBe('正在更新密码');
    expect(linkOperationPending('removingLink')).toBe('正在移除链接');
  });

  it('is not a single shared string', () => {
    const lines = Object.values(LINK_OPERATION_PENDING).map((entry) => entry.label);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('carries the official key next to each line', () => {
    expect(LINK_OPERATION_PENDING.updatingLink.key).toBe('collab.updating.link');
    expect(LINK_OPERATION_PENDING.updatingPassword.key).toBe('collab.updating.password');
    expect(LINK_OPERATION_PENDING.removingLink.key).toBe('collab.removing.link');
  });
});

describe('the completion lines', () => {
  it('are the collected sentences, verbatim', () => {
    expect(LINK_OPERATION_DONE.updatingPassword.label).toBe('私密链接密码已成功更新');
    expect(LINK_OPERATION_DONE.removingLink.label).toBe('私密链接已成功移除');
    expect(LINK_OPERATION_DONE.secretLinkCreated.label).toBe('私密链接已成功创建');
  });

  it('pairs only the two operations the source pairs', () => {
    expect(linkOperationDone('updatingPassword')).toBe('私密链接密码已成功更新');
    expect(linkOperationDone('removingLink')).toBe('私密链接已成功移除');
    expect(linkOperationDone('updatingLink')).toBeNull();
  });
});
