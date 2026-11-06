/**
 * G163 —— 邮件通知是**按空间**的：官方那段的描述逐字是「如果你想在此空间中接收提及和评论的
 * 电子邮件通知，请启用」。本地空间是一等实体（`Space.settings` 是 JSON），所以覆盖值就放在
 * 那里，按成员 userId 分开——同一空间里每个成员各管自己那枚开关。
 *
 * 形状：`settings.notifications.emailComments = { [userId]: boolean }`。
 * 没写＝跟随全局（`user.notifyComments`）。纯函数只做读写与保留其它键，不碰数据库。
 */

export interface SpaceNotificationSettings {
  notifications?: {
    emailComments?: Record<string, boolean>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** 读这名成员在这个空间里的邮件覆盖值；没设过返回 null（＝跟随全局）。 */
export function readSpaceEmailOverride(settings: unknown, userId: string): boolean | null {
  const root = asRecord(settings);
  const notifications = asRecord(root?.notifications);
  const email = asRecord(notifications?.emailComments);
  const value = email?.[userId];
  return typeof value === 'boolean' ? value : null;
}

/**
 * 写入／清除覆盖值。`null` 删除这名成员那一格（并顺手清掉空容器），其它键一律原样保留。
 * 返回新对象，不改入参。
 */
export function writeSpaceEmailOverride(
  settings: unknown,
  userId: string,
  value: boolean | null,
): SpaceNotificationSettings {
  const root: SpaceNotificationSettings = { ...(asRecord(settings) ?? {}) };
  const notifications = { ...(asRecord(root.notifications) ?? {}) };
  const email = { ...(asRecord(notifications.emailComments) ?? {}) };

  if (value === null) delete email[userId];
  else email[userId] = value;

  if (Object.keys(email).length > 0) notifications.emailComments = email;
  else delete notifications.emailComments;

  if (Object.keys(notifications).length > 0) root.notifications = notifications;
  else delete root.notifications;

  return root;
}

/** 生效值＝覆盖值 ?? 全局值。 */
export function effectiveSpaceEmail(globalValue: boolean, override: boolean | null): boolean {
  return override ?? globalValue;
}