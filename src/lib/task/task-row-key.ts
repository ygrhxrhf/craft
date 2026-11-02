/**
 * G1574 —— 任务行是键盘可达的：Space 与 Ctrl/⌘-Alt-T 都把这条任务勾成完成态。
 * （官方行是 `div[role="button"]`，点击后焦点在行上，这两枚键才有作用对象。）
 */
export function taskRowKeyAction(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}): 'toggle' | null {
  if (event.key === ' ' || event.key === 'Spacebar') return 'toggle';
  if (
    (event.ctrlKey === true || event.metaKey === true) &&
    event.altKey === true &&
    event.shiftKey !== true &&
    event.key.toLowerCase() === 't'
  ) {
    return 'toggle';
  }
  return null;
}
