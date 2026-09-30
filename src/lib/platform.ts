export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
export function storageBackend(): 'sqlite' | 'idb' {
  return isDesktop() ? 'sqlite' : 'idb';
}
export function notify(title: string, body: string): void {
  if (isDesktop()) {
    // Tauri 原生通知（仅同步 error/大附件完成，spec 8.2）
    void import('@tauri-apps/plugin-notification')
      .then((m) => m.sendNotification({ title, body }))
      .catch(() => {
        // 降级到 Web Notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(title, { body });
        }
      });
    return;
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}
export function openExternal(url: string): void {
  if (isDesktop()) {
    void import('@tauri-apps/plugin-shell')
      .then((m) => m.open(url))
      .catch(() => window.open(url, '_blank', 'noopener'));
    return;
  }
  window.open(url, '_blank', 'noopener');
}
