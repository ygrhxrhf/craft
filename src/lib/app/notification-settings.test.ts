import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/**
 * 事件文案的唯一权威是 feature-catalog.md（G163 三句均带官方句尾句号）。这里从台账回读逐字校验，
 * 面板端则只渲染常量——两边都钉住，任何一侧漂移都会红。
 */
const catalog = readFileSync(
  join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'),
  'utf8',
);

describe('the event labels are the collected official text', () => {
  it.each([
    ['commentsAndMentions'],
    ['reminders'],
    ['dailyTasks'],
  ] as const)('%s appears verbatim in the feature catalog', (event) => {
    expect(catalog).toContain(NOTIFICATION_EVENTS[event].label);
  });
});

describe('the notifications panel renders the shared labels', () => {
  const panels = readFileSync(
    join(process.cwd(), 'src/components/settings/SettingsPanels.tsx'),
    'utf8',
  );

  it('consumes NOTIFICATION_EVENTS instead of restating the sentences', () => {
    // 匹配引用形态，不做裸句匹配（裸句会把注释里的引用一并算进来）。
    expect(panels).toContain('{NOTIFICATION_EVENTS.commentsAndMentions.label}');
    expect(panels).toContain('{NOTIFICATION_EVENTS.reminders.label}');
    expect(panels).toContain('{NOTIFICATION_EVENTS.dailyTasks.label}');
  });
});
