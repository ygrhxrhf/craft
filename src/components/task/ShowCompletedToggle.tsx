'use client';

import { useEffect, useState } from 'react';
import { readShowCompleted, writeShowCompleted } from '@/lib/task/grouping';

/**
 * 「显示已完成的任务」. One control for the tasks page and the calendar, since both read the same
 * device setting and neither should grow its own copy of it.
 */
export function ShowCompletedToggle({ onChange }: { onChange: (show: boolean) => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const stored = readShowCompleted(window.localStorage);
    setShow(stored);
    onChange(stored);
    // The parent hands an inline callback; the stored value is read once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <input
        type="checkbox"
        role="switch"
        aria-label="显示已完成的任务"
        checked={show}
        onChange={(event) => {
          const next = event.target.checked;
          setShow(next);
          writeShowCompleted(window.localStorage, next);
          onChange(next);
        }}
      />
      显示已完成的任务
    </label>
  );
}
