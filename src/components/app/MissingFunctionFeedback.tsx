'use client';

import { FEEDBACK_KEYS, FEEDBACK_SUBMIT_LABEL } from '@/lib/app/feedback';
import { useFeedbackStore } from '@/lib/store/use-feedback-store';

/**
 * G1415：公式编辑器空态里的「缺函数」反馈口。官方同一个 chunk 两处同形——一句
 * `feedback.table.missing.function`（「缺少功能？告诉我们！」）＋一枚
 * `preferences.send.feedback`（「意见反馈」）。官方把「函数表不够用」当一条**可反馈的缺口**，
 * 不是 bug ⇒ 这里不用报错语气（`muted`，不是 destructive）。
 */
export function MissingFunctionFeedback({ className }: { className?: string }) {
  const openFeedback = useFeedbackStore((s) => s.openFeedback);
  return (
    <p className={className ?? 'text-xs text-muted-foreground'}>
      {FEEDBACK_KEYS['feedback.table.missing.function']}
      <button
        type="button"
        onClick={openFeedback}
        className="ml-1 text-(--craft-accent) hover:underline"
      >
        {FEEDBACK_SUBMIT_LABEL}
      </button>
    </p>
  );
}
