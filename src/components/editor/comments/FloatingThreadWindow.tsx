'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

import { getThreads, setThreadResolved } from '@/actions/comment/comment';
import { useThreadWindowStore } from '@/lib/store/use-thread-window-store';
import { relativeTime } from '@/lib/document/relative-time';
import type { ThreadView } from './comment-overlay';
import { cn } from 'cn';

/**
 * G58：正文评论高亮的**浮动线程窗口**。右侧信息栏是「整页评论」，这里是「只看这一条线程」。
 * 打开来源有两处：点 `[data-thread-id]` 的正文高亮，或从别处调用 store。
 */
export function FloatingThreadWindow({ documentId }: { documentId: string }) {
  const { threadId, anchor, close } = useThreadWindowStore();
  const [thread, setThread] = useState<ThreadView | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!threadId) {
      setThread(null);
      return;
    }
    let alive = true;
    setLoading(true);
    getThreads(documentId)
      .then((rows: ThreadView[]) => {
        if (!alive) return;
        setThread(rows.find((row) => row.id === threadId) ?? null);
      })
      .catch(() => {
        if (alive) setThread(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [documentId, threadId]);

  // 点正文高亮开窗：高亮由 comment-mark 渲染成 `[data-thread-id]` 的 span。
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const mark = target?.closest?.('[data-thread-id]') as HTMLElement | null;
      if (!mark) return;
      const id = mark.getAttribute('data-thread-id');
      if (!id) return;
      const rect = mark.getBoundingClientRect();
      useThreadWindowStore.getState().open(id, { top: rect.top, bottom: rect.bottom, left: rect.left });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Esc 只关这一层（与官方"一次 Esc 弹一层"的栈式语义同向）。
  useEffect(() => {
    if (!threadId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [threadId, close]);

  if (!threadId) return null;

  const top = Math.min(Math.max((anchor?.top ?? 120) - 8, 72), Math.max(72, window.innerHeight - 360));
  const left = Math.min(Math.max(anchor?.left ?? 120, 16), Math.max(16, window.innerWidth - 336));

  const toggleResolved = async () => {
    if (!thread || busy) return;
    setBusy(true);
    try {
      await setThreadResolved(thread.id, !thread.resolved);
      setThread({ ...thread, resolved: !thread.resolved });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="floating-thread-window"
      role="dialog"
      aria-label="评论线程"
      style={{ top, left }}
      className="fixed z-40 w-80 rounded-xl border border-border bg-background shadow-lg"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <MessageSquare className="size-3.5 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-xs text-foreground/60">
          {thread?.blockText || '评论'}
        </span>
        <button
          type="button"
          aria-label="关闭评论线程"
          onClick={close}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-foreground/4 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto px-3 py-3">
        {loading && <p className="text-xs text-muted-foreground">加载中…</p>}
        {!loading && !thread && <p className="text-xs text-muted-foreground">这条评论线程已不存在。</p>}
        {thread?.comments.map((comment) => (
          <div key={comment.id} className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-foreground/45">
              <span className="font-medium text-foreground/70">{comment.mine ? '我' : '成员'}</span>
              <span>·</span>
              <span>{relativeTime(comment.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-[13px] text-foreground/85">{comment.body}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <span className={cn('text-[11px]', thread?.resolved ? 'text-emerald-600' : 'text-foreground/45')}>
          {thread?.resolved ? '已解决' : '未解决'}
        </span>
        <button
          type="button"
          disabled={!thread || busy}
          onClick={() => void toggleResolved()}
          className="rounded-md border border-border px-2 py-1 text-[11px] text-foreground/70 transition-colors hover:bg-foreground/4 disabled:opacity-40"
        >
          {thread?.resolved ? '取消解决' : '标记为已解决'}
        </button>
      </div>
    </div>
  );
}
