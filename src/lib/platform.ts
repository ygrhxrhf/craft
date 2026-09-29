export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
export function storageBackend(): 'sqlite' | 'idb' {
  return isDesktop() ? 'sqlite' : 'idb';
}
export function notify(title: string, body: string): void {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}
export function openExternal(url: string): void {
  window.open(url, isDesktop() ? '_blank' : '_blank', 'noopener');
}
