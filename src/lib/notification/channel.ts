/** G42: a poller batch belongs on the notification channel only if it touches that table. */
export function isNotificationMessage(message: { tables?: unknown }): boolean {
  return Array.isArray(message.tables) && message.tables.includes('notification');
}
