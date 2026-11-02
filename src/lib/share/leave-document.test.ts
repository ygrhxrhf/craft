import { describe, expect, it } from 'vitest';
import {
  LEAVE_CONFIRM,
  LEAVE_DOCUMENT_KEY,
  LEAVE_DOCUMENT_SINGULAR,
  LEAVE_DOCUMENTS_KEY,
  leaveConfirmKey,
  leaveConfirmMessage,
} from './leave-document';

describe('leaveConfirmMessage (G298)', () => {
  it('one document uses the singular sentence, verbatim', () => {
    expect(leaveConfirmMessage(1)).toBe('你确定要离开该文档吗？你可能无法再访问它。');
    expect(LEAVE_DOCUMENT_SINGULAR).toBe('你确定要离开该文档吗？你可能无法再访问它。');
  });

  it('several documents use the plural sentence with [0] filled in', () => {
    expect(leaveConfirmMessage(3)).toBe('你确定要离开 3 个文档吗？你可能无法再访问它们。');
  });

  it('carries the consequence clause — leaving is not a reversible unsubscribe', () => {
    expect(leaveConfirmMessage(1)).toContain('无法再访问');
    expect(leaveConfirmMessage(5)).toContain('无法再访问');
  });

  it('zero falls back to the singular sentence (callers should have blocked it)', () => {
    expect(leaveConfirmMessage(0)).toBe(LEAVE_DOCUMENT_SINGULAR);
  });
});

describe('leaveConfirmKey (G298: singular / plural are two keys)', () => {
  it('picks the singular key for one and the plural key for many', () => {
    expect(leaveConfirmKey(1)).toBe('alert.leave.document');
    expect(leaveConfirmKey(2)).toBe('alert.confirm.leave.documents');
  });

  it('the keys are the collected ones', () => {
    expect(LEAVE_DOCUMENT_KEY).toBe('alert.leave.document');
    expect(LEAVE_DOCUMENTS_KEY).toBe('alert.confirm.leave.documents');
  });
});

describe('the confirm button', () => {
  it('reads 离开, not a generic 确定', () => {
    expect(LEAVE_CONFIRM).toBe('离开');
  });
});
