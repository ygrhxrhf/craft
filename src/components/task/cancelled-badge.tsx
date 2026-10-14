'use client';

import { CANCELLED_LABEL, cancelledOnText } from '@/lib/editor/task-status';

/**
 * 三档里的第三档在列表上的样子（G52）。官方有两句词：`tasks.cancelled`「已取消」是屏上那枚标签，
 * `tasks.canceled.on`「已于 [0] 取消」是把日期填进去的完整那句——列表的宽度放不下第二句，
 * 所以它挂在悬停上，且只有取消时间戳在的时候才说得出。
 */
export function CancelledBadge({ cancelledAt }: { cancelledAt: string | null }) {
  const date = cancelledAt ? new Date(cancelledAt) : null;
  const title = date
    ? cancelledOnText(`${date.getMonth() + 1}月${date.getDate()}日`)
    : CANCELLED_LABEL;
  return (
    <span
      className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
      title={title}
    >
      {CANCELLED_LABEL}
    </span>
  );
}
