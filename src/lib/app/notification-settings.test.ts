import { describe, expect, it } from 'vitest';

import {
  EMAIL_PER_SPACE_DESC,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENTS,
  dailySummaryChannels,
  isPerSpace,
} from './notification-settings';

/**
 * The notification settings matrix (G163). Three channels, three events, and the email channel is
 * per-space rather than one global switch.
 */
describe('the three channels', () => {
  it('carries the collected keys and labels', () => {
    expect(NOTIFICATION_CHANNELS.push).toEqual({ label: '推送', key: 'notifications.push' });
    expect(NOTIFICATION_CHANNELS.email.key).toBe('notifications.email');
    expect(NOTIFICATION_CHANNELS.dailyEmail).toEqual({ label: '每日电子邮件', key: 'daily.email' });
  });

  it('scopes only the email channel to a space', () => {
    expect(isPerSpace('email')).toBe(true);
    expect(isPerSpace('push')).toBe(false);
    expect(isPerSpace('dailyEmail')).toBe(false);
  });
});

describe('the three events', () => {
  it('carries the collected keys', () => {
    expect(NOTIFICATION_EVENTS.commentsAndMentions.key).toBe('comments.and.mentions');
    expect(NOTIFICATION_EVENTS.reminders.key).toBe('reminders.desc');
    expect(NOTIFICATION_EVENTS.dailyTasks.key).toBe('daily.email.desc');
  });
});

describe('the daily summary', () => {
  it('travels both the email and the push channel', () => {
    expect(dailySummaryChannels()).toEqual(['dailyEmail', 'push']);
  });

  it('keeps the per-space email description verbatim', () => {
    expect(EMAIL_PER_SPACE_DESC).toBe('如果你想在此空间中接收提及和评论的电子邮件通知，请启用');
  });
});
