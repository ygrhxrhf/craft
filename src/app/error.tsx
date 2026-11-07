'use client';

import { useEffect, useState } from 'react';

import { isLazyLoadError, LAZY_LOAD_DESC, LAZY_LOAD_TITLE } from '@/lib/errors/lazy-load';
import {
  DOING_EXAMPLE,
  DOING_LABEL,
  HAPPENS_EVERY_TIME,
  KEEPS_HAPPENING,
  REPORT_ERROR,
  REPORT_ISSUE,
  REPORT_ISSUE_DESC,
  REPORT_LOCAL_NOTE,
  REPORT_SUBMIT,
  REPORT_SUBMITTED,
  STEPS_EXAMPLE,
  STEPS_LABEL,
  emptyReportDraft,
  isReportSubmittable,
  reportTitleForPlatform,
  type ErrorReportDraft,
  type FrequencyAnswer,
} from '@/lib/browse/error-report';

/**
 * `gap.md` G90：懒加载 chunk 失败要有专门的屏上文案（官方的 `alert.lazy.load.*`），
 * 而不是让它落进通用兜底、只说一句「出错了」。
 *
 * `gap.md` G329：通用错误分支带上官方的**结构化崩溃报告表单**（`error.report.*`）——
 * 报告问题 / 说明句 / 重复频率两问 / 两个字段（各带示例占位符）/ Web 平台标题。
 * ☆ 表单纯本地：没有后端接收口，提交只把草稿记在这一页里；屏上明说不上传。
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lazy = isLazyLoadError(error);
  const [draft, setDraft] = useState<ErrorReportDraft>(emptyReportDraft);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    // 留痕：chunk 失败以前是"白屏 + 控制台"，现在至少有一条可搜的日志
    console.error(lazy ? '[lazy-load] 功能模块加载失败' : '[render] 未捕获错误', error);
  }, [error, lazy]);

  const frequency = (label: string, value: FrequencyAnswer, onChange: (next: FrequencyAnswer) => void) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-foreground/80">{label}</span>
      <div className="flex gap-1">
        {(['yes', 'no'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`h-6 rounded-md border px-2 text-[11px] transition-colors ${
              value === option ? 'border-foreground/40 bg-foreground/10' : 'border-input hover:bg-muted'
            }`}
          >
            {option === 'yes' ? '是' : '否'}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-sm font-medium">{lazy ? LAZY_LOAD_TITLE : '页面出错了'}</p>
      <p className="text-xs text-muted-foreground">{lazy ? LAZY_LOAD_DESC : '请重试；若反复出现，刷新页面。'}</p>
      <button
        type="button"
        onClick={() => {
          if (lazy) {
            window.location.reload();
            return;
          }
          reset();
        }}
        className="mt-2 h-8 rounded-md border border-input px-3 text-xs transition-colors hover:bg-muted"
      >
        {lazy ? '重新加载页面' : '重试'}
      </button>

      {!lazy && (
        <form
          data-testid="error-report-form"
          aria-label={REPORT_ERROR}
          className="mt-6 w-full max-w-md rounded-lg border border-border bg-card p-4 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            // 本地表单：不上传，只把这份草稿标记为"已记录"。
            setSubmitted(true);
          }}
        >
          <p className="text-sm font-semibold">{reportTitleForPlatform('web')}</p>
          <p className="mt-1 text-xs text-foreground/80">{REPORT_ISSUE}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{REPORT_ISSUE_DESC}</p>

          <div className="mt-3 flex flex-col gap-1.5">
            {frequency(HAPPENS_EVERY_TIME, draft.happensEveryTime, (next) =>
              setDraft((current) => ({ ...current, happensEveryTime: next })),
            )}
            {frequency(KEEPS_HAPPENING, draft.keepsHappening, (next) =>
              setDraft((current) => ({ ...current, keepsHappening: next })),
            )}
          </div>

          <label className="mt-3 block text-xs font-medium" htmlFor="error-report-steps">
            {STEPS_LABEL}
          </label>
          <textarea
            id="error-report-steps"
            rows={4}
            placeholder={STEPS_EXAMPLE}
            value={draft.steps}
            onChange={(event) => setDraft((current) => ({ ...current, steps: event.target.value }))}
            className="mt-1 w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          />

          <label className="mt-2 block text-xs font-medium" htmlFor="error-report-doing">
            {DOING_LABEL}
          </label>
          <textarea
            id="error-report-doing"
            rows={2}
            placeholder={DOING_EXAMPLE}
            value={draft.doing}
            onChange={(event) => setDraft((current) => ({ ...current, doing: event.target.value }))}
            className="mt-1 w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">{REPORT_LOCAL_NOTE}</span>
            <button
              type="submit"
              disabled={!isReportSubmittable(draft)}
              className="h-7 rounded-md bg-craft-accent px-3 text-xs text-white transition-opacity disabled:opacity-50"
            >
              {REPORT_SUBMIT}
            </button>
          </div>
          {submitted && (
            <p data-testid="error-report-saved" className="mt-2 text-[11px] text-foreground/70">
              {REPORT_SUBMITTED}
            </p>
          )}
        </form>
      )}
    </div>
  );
}