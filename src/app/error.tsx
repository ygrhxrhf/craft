'use client';

import { useEffect } from 'react';

import { isLazyLoadError, LAZY_LOAD_DESC, LAZY_LOAD_TITLE } from '@/lib/errors/lazy-load';

/**
 * `gap.md` G90：懒加载 chunk 失败要有专门的屏上文案（官方的 `alert.lazy.load.*`），
 * 而不是让它落进通用兜底、只说一句「出错了」。
 *
 * ☆ 两条分支共用这一个边界：chunk 拉不下来走官方那两句逐字 + 「重新加载页面」；
 *   其余运行时错误走通用句子 + 「重试」（Next 的 `reset()` 会重渲染这一段）。
 *   判据在 `isLazyLoadError`（纯函数，单独测）；这里只负责"按判据选一句文案"。
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lazy = isLazyLoadError(error);
  useEffect(() => {
    // 留痕：chunk 失败以前是"白屏 + 控制台"，现在至少有一条可搜的日志
    console.error(lazy ? '[lazy-load] 功能模块加载失败' : '[render] 未捕获错误', error);
  }, [error, lazy]);

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
    </div>
  );
}
