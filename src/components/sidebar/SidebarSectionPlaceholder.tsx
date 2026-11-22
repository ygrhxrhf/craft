'use client';

import { LOADING } from '@/lib/browse/official-copy';

/**
 * 侧栏分区的「没有行可画」状态。
 *
 * 以前只有一种表现：快照没到手就印「加载中…」，请求失败也照印——于是一次服务端 500
 * 就变成永远转不完的加载条，用户既不知道失败了，也没有任何重试入口。现在把两态分开：
 * 还在路上是 LOADING（与官方一致），失败要说「加载失败」并给一枚可点的重试。
 */
export function SidebarSectionPlaceholder({
  failed,
  onRetry,
}: {
  failed: boolean;
  onRetry: () => void;
}) {
  if (!failed) {
    return <div className="px-3 py-2 text-[13px] text-muted-foreground">{LOADING}</div>;
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-[13px] text-muted-foreground">
      <span>加载失败</span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded px-1.5 py-0.5 text-foreground/70 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
      >
        重试
      </button>
    </div>
  );
}
