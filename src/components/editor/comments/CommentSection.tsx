'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare, Check, Trash2, X } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { getThreads } from '@/actions/comment/comment';
import { getSyncManager } from '@/lib/sync-core';
import { readPendingRows, readLocalRecords } from '@/components/sync/local-records';
import { overlayCommentThreads, pickViewerId, type ThreadView } from './comment-overlay';

interface CommentRow {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

interface ThreadRow {
  id: string;
  blockText: string;
  resolved: boolean;
  comments: CommentRow[];
}

interface CommentSectionProps {
  documentId: string;
  editor: Editor | null;
}

function toRows(threads: ThreadView[]): ThreadRow[] {
  return threads.map((thread) => ({
    id: thread.id,
    blockText: thread.blockText,
    resolved: thread.resolved,
    comments: thread.comments.map((comment) => ({
      id: comment.id,
      userId: comment.userId,
      body: comment.body,
      createdAt: comment.createdAt,
      mine: comment.mine,
    })),
  }));
}

export function CommentSection({ documentId, editor }: CommentSectionProps) {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [draft, setDraft] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [showComposer, setShowComposer] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user?.id;
  // 离线/加载中 session 可能为空：viewer id 由本地 user 镜像兜底，写入不依赖 session
  const viewerIdRef = useRef<string | null>(null);

  const reload = useCallback(async () => {
    const [pendingThreads, pendingComments, userRows] = await Promise.all([
      readPendingRows('comment_thread'),
      readPendingRows('comment'),
      readLocalRecords('user'),
    ]);
    const viewerId = pickViewerId(userId, userRows);
    viewerIdRef.current = viewerId;
    let serverThreads: ThreadView[] = [];
    try {
      serverThreads = (await getThreads(documentId)) as ThreadView[];
    } catch {
      // 离线：服务端读不到，退回本地 pending overlay，本地写入仍可见
    }
    setThreads(toRows(overlayCommentThreads(serverThreads, pendingThreads, pendingComments, viewerId)));
  }, [documentId, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table === 'comment' || table === 'comment_thread') void reload();
  }), [reload]);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => setHasSelection(!editor.state.selection.empty);
    refresh();
    editor.on('selectionUpdate', refresh);
    return () => {
      editor.off('selectionUpdate', refresh);
    };
  }, [editor]);

  const handleCreate = async () => {
    if (!editor || !draft.trim()) return;
    const { from, to } = editor.state.selection;

    // 找到选区起点所在最底层 block 作为锚点
    const parent = editor.state.doc.resolve(from).parent;
    const blockText = parent.textBetween(0, parent.content.size, '\n', '');

    try {
      const body = draft.slice(0, 2000);
      // 线程 + 首条回复 → applyLocal（本地 id，先落地再推送）。
      // userId 只作本地乐观标记；服务端会按会话覆盖，缺了也不影响推送。
      const viewerId = viewerIdRef.current ?? userId ?? null;
      const threadId = crypto.randomUUID();
      const commentId = crypto.randomUUID();
      await getSyncManager().applyLocal({
        table: 'comment_thread',
        id: threadId,
        patch: { documentId, blockId: null, blockText: blockText.slice(0, 500), resolved: false },
      });
      await getSyncManager().applyLocal({
        table: 'comment',
        id: commentId,
        patch: { threadId, ...(viewerId ? { userId: viewerId } : {}), body },
      });
      editor.chain().focus().setComment(threadId).run();
      setDraft('');
      setShowComposer(false);
      await reload();
    } catch {
      // 提交失败保持草稿
    }
  };

  const handleReply = async (threadId: string) => {
    const body = replyDrafts[threadId]?.trim();
    if (!body) return;
    try {
      const text = body.slice(0, 2000);
      const viewerId = viewerIdRef.current ?? userId ?? null;
      await getSyncManager().applyLocal({
        table: 'comment',
        id: crypto.randomUUID(),
        patch: { threadId, ...(viewerId ? { userId: viewerId } : {}), body: text },
      });
      setReplyDrafts((prev) => ({ ...prev, [threadId]: '' }));
      await reload();
    } catch {
      // 提交失败保持草稿
    }
  };

  const handleResolve = async (threadId: string, resolved: boolean) => {
    try {
      await getSyncManager().applyLocal({
        table: 'comment_thread',
        id: threadId,
        patch: { resolved },
      });
      await reload();
    } catch {
      // 状态更新失败保持原状
    }
  };

  const handleDelete = async (thread: ThreadRow, commentId: string) => {
    const target = thread.comments.find((comment) => comment.id === commentId);
    if (!target?.mine) return;
    try {
      const deletedAt = new Date().toISOString();
      await getSyncManager().applyLocal({
        table: 'comment',
        id: commentId,
        patch: { deletedAt },
      });
      const remaining = thread.comments.filter((comment) => comment.id !== commentId);
      if (remaining.length === 0) {
        await getSyncManager().applyLocal({
          table: 'comment_thread',
          id: thread.id,
          patch: { deletedAt },
        });
        // 线程连同标记一起消失：正文里的评论高亮也要摘掉
        editor?.commands.removeComment(thread.id);
      }
      await reload();
    } catch {
      // 删除失败保持原状
    }
  };

  const openThreads = threads.filter((thread) => !thread.resolved);
  const resolvedThreads = threads.filter((thread) => thread.resolved);

  return (
    <section>
      <h4 className="mb-2 flex items-center gap-1.5 text-caption font-medium uppercase tracking-wider text-foreground/40">
        <MessageSquare className="size-3" />
        评论 ({openThreads.length})
      </h4>

      {hasSelection && !showComposer && (
        <button
          type="button"
          onClick={() => setShowComposer(true)}
          className="mb-2 w-full rounded-md border border-foreground/10 px-2 py-1.5 text-meta transition-colors duration-150 ease-craft hover:bg-foreground/4"
        >
          评论所选文本
        </button>
      )}
      {showComposer && (
        <div className="mb-2 rounded-md border border-foreground/10 p-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder="写下评论..."
            className="w-full resize-none rounded-md border border-foreground/10 bg-transparent p-2 text-meta outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="rounded-md px-2 py-1 text-meta text-foreground/55 transition-colors duration-150 ease-craft hover:text-foreground/85"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={handleCreate}
              className="rounded-lg bg-craft-accent px-3 py-1 text-meta font-medium text-white transition-colors duration-150 ease-craft hover:bg-craft-accent-hover disabled:opacity-50"
            >
              发布
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {openThreads.map((thread) => (
          <div key={thread.id} className="rounded-md border border-foreground/10 p-2">
            {thread.blockText && (
              <p className="mb-1.5 line-clamp-2 border-l-2 border-foreground/15 pl-2 text-meta text-foreground/40">
                {thread.blockText}
              </p>
            )}
            {thread.comments.map((comment) => (
              <p key={comment.id} className="group flex items-start gap-1 text-meta text-foreground/85">
                <span className="min-w-0 flex-1">{comment.body}</span>
                {comment.mine && (
                  <button
                    type="button"
                    title="删除"
                    onClick={() => void handleDelete(thread, comment.id)}
                    className="rounded-md p-1 text-foreground/40 opacity-0 transition-opacity duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground/85 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </p>
            ))}
            <div className="mt-1.5 flex items-center gap-1">
              <input
                value={replyDrafts[thread.id] ?? ''}
                onChange={(event) =>
                  setReplyDrafts((prev) => ({ ...prev, [thread.id]: event.target.value }))
                }
                placeholder="回复..."
                className="flex-1 rounded-md border border-foreground/10 bg-transparent px-2 py-1 text-meta outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <button
                type="button"
                disabled={!replyDrafts[thread.id]?.trim()}
                onClick={() => void handleReply(thread.id)}
                className="rounded-md px-2 py-1 text-meta font-medium text-craft-accent transition-colors duration-150 ease-craft hover:bg-craft-accent/12 disabled:opacity-50"
              >
                回复
              </button>
              <button
                type="button"
                title="解决"
                onClick={() => void handleResolve(thread.id, true)}
                className="rounded-md p-1 text-foreground/40 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground/85"
              >
                <Check className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {resolvedThreads.length > 0 && (
          <details>
            <summary className="cursor-pointer text-meta text-foreground/40 transition-colors hover:text-foreground/70">
              已解决 ({resolvedThreads.length})
            </summary>
            {resolvedThreads.map((thread) => (
              <div
                key={thread.id}
                className="mt-1 flex items-center justify-between rounded-md border border-foreground/10 p-2 opacity-60"
              >
                <span className="line-clamp-1 text-meta">{thread.comments[0]?.body}</span>
                <button
                  type="button"
                  title="重新打开"
                  onClick={() => void handleResolve(thread.id, false)}
                  className="p-1 text-foreground/40 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground/85"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </details>
        )}
      </div>
    </section>
  );
}
