import { describe, expect, it } from 'vitest';
import {
  RECONNECT_TO_COMMENT,
  RECONNECT_TO_COMMENT_KEY,
  commentEntryAllowed,
  commentSubmitAllowed,
  offlineCommentMessage,
} from './offline-comment';

describe('offline comment gate (G1609)', () => {
  it('the entry is never gated — the composer opens offline', () => {
    expect(commentEntryAllowed()).toBe(true);
  });

  it('submitting is blocked while offline', () => {
    expect(commentSubmitAllowed(false)).toBe(false);
    expect(commentSubmitAllowed(true)).toBe(true);
  });

  it('the refusal carries the collected sentence, verbatim', () => {
    expect(offlineCommentMessage()).toBe('重新连接网络以添加评论');
    expect(RECONNECT_TO_COMMENT).toBe('重新连接网络以添加评论');
    expect(RECONNECT_TO_COMMENT_KEY).toBe('alert.reconnect.to.the.internet.to.comment');
  });
});
