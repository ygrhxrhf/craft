'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  readShowCompletedNow,
  serverShowCompleted,
  subscribeShowCompleted,
  writeShowCompleted,
} from '@/lib/task/grouping';

/**
 * 「显示已完成的任务」. One control for the tasks page and the calendar, since both read the same
 * device setting and neither should grow its own copy of it.
 *
 * The stored value is read through `useSyncExternalStore`: the server snapshot is `false` (the
 * switch starts off, matching the SSR HTML) and the client snapshot is what this device remembers.
 */
export function ShowCompletedToggle({ onChange }: { onChange: (show: boolean) => void }) {
  const show = useSyncExternalStore(subscribeShowCompleted, readShowCompletedNow, serverShowCompleted);

  // 把当前值告诉父组件（父组件拿它过滤列表）。这是 effect 的正当用途：同步外部系统，
  // 而不是设置本组件自己的 state。`onChange` 是内联回调，故只跟着 show 变。
  useEffect(() => {
    onChange(show);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <input
        type="checkbox"
        role="switch"
        aria-label="显示已完成的任务"
        checked={show}
        onChange={(event) => writeShowCompleted(window.localStorage, event.target.checked)}
      />
      显示已完成的任务
    </label>
  );
}
