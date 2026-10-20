/**
 * The notification settings matrix (G163). Three channels crossed with three events, and the
 * email channel is per-space rather than one global switch.
 *
 * The daily summary is the one entry that travels both channels: its description says the digest
 * arrives by email *and* that a push goes out for what is due today.
 */

export type NotificationChannel = 'push' | 'email' | 'dailyEmail';
export type NotificationEvent = 'commentsAndMentions' | 'reminders' | 'dailyTasks';

export interface NotificationChannelInfo {
  label: string;
  key: string;
  /** Whether this channel is scoped to one space rather than the whole account. */
  perSpace?: boolean;
}

export const NOTIFICATION_CHANNELS: Record<NotificationChannel, NotificationChannelInfo> = {
  push: { label: '推送', key: 'notifications.push' },
  email: { label: '电子邮件', key: 'notifications.email', perSpace: true },
  dailyEmail: { label: '每日电子邮件', key: 'daily.email' },
};

export interface NotificationEventInfo {
  label: string;
  key: string;
}

export const NOTIFICATION_EVENTS: Record<NotificationEvent, NotificationEventInfo> = {
  commentsAndMentions: {
    label: '当你收到新的评论和提及时得到通知。',
    key: 'comments.and.mentions',
  },
  reminders: {
    label: '当需要提醒时，Craft 会向你发送通知。',
    key: 'reminders.desc',
  },
  dailyTasks: {
    label: '接收当天所有任务和提醒的摘要。你还将收到今天截止的摘要推送通知。',
    key: 'daily.email.desc',
  },
};

/** The per-space email description, verbatim. */
export const EMAIL_PER_SPACE_DESC = '如果你想在此空间中接收提及和评论的电子邮件通知，请启用';
export const EMAIL_PER_SPACE_DESC_KEY = 'notifications.email.desc';

/** The daily summary travels both the email and the push channel. */
export function dailySummaryChannels(): NotificationChannel[] {
  return ['dailyEmail', 'push'];
}

/** Whether a channel's switch is scoped to one space. */
export function isPerSpace(channel: NotificationChannel): boolean {
  return NOTIFICATION_CHANNELS[channel].perSpace === true;
}
