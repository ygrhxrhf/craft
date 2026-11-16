'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare, Check, Trash2, X } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { getThreads } from '@/actions/comment/comment';
import { getSyncManager } from '@/lib/sync-core';
import { readPendingRows, readLocalRecords } from '@/components/sync/local-records';
import { overlayCommentThreads, pickViewerId, type ThreadView } from './comment-overlay';
import { useCommentRequestStore } from '@/lib/store/use-comment-request-store';
import { composerKey } from './composer-keys';
import { RichText } from '@/components/ui/rich-text';
import { COMMENT_HINT_MENTION, COMMENT_HINT_NEW_LINE, COMMENT_HINT_SEND, commentHintEmoji } from '@/lib/i18n/comment-hint-copy';
import { EmojiSuggest } from './EmojiSuggest';
import { MentionSuggest } from './MentionSuggest';
import { groupReactions, reactionSentence } from './reaction-copy';
import { reactionRowId, type Reaction } from './reactions';
import { offlineReactionMessage } from './offline-reaction';
import { commentSubmitAllowed, offlineCommentMessage } from '@/lib/comment/offline-comment';
import { THREAD_RESOLVED_TOAST, THREAD_UNRESOLVED_TOAST, TYPE_TO_UNRESOLVE } from '@/lib/comment/thread-copy';
import { toast } from '@/components/ui/toast';
import { resolvedByText, resolvedToggleHint, resolvedToggleLabel } from '@/lib/comment/resolved-toggle';

const REACTION_CHOICES = ['👍', '❤️', '😄', '🎉'];

interface CommentRow {
  id: string;
  userId: string;
  body: string;
  reactions: Reaction[];
  createdAt: string;
  mine: boolean;
}

interface ThreadRow {
  id: string;
  blockText: string;
  resolved: boolean;
  /** G74: who resolved it (null when unresolved or unknown). */
  resolvedBy: string | null;
  comments: CommentRow[];
}

interface CommentSectionProps {
  documentId: string;
  editor: Editor | null;
  /** G588: a viewer can read threads but not compose — the comment capability is its own key. */
  canComment?: boolean;
}

function toRows(threads: ThreadView[]): ThreadRow[] {
  return threads.map((thread) => ({
    id: thread.id,
    blockText: thread.blockText,
    resolved: thread.resolved,
    resolvedBy: thread.resolvedBy,
    comments: thread.comments.map((comment) => ({
      id: comment.id,
      userId: comment.userId,
      body: comment.body,
      reactions: comment.reactions ?? [],
      createdAt: comment.createdAt,
      mine: comment.mine,
    })),
  }));
}

export function CommentSection({ documentId, editor, canComment = true }: CommentSectionProps) {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [draft, setDraft] = useState('');
  const [draftCaret, setDraftCaret] = useState(0);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyCarets, setReplyCarets] = useState<Record<string, number>>({});
  const [showComposer, setShowComposer] = useState(false);
  const [offline, setOffline] = useState(false);
  // G1609：离线提交被拦时那句内联文案（不是 toast、不是弹窗）。
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  // G74：已解决区默认收起；展开时标签翻成「隐藏已解决」（官方短标签＋长说明两套）。
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const [hasSelection, setHasSelection] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user?.id;
  // 离线/加载中 session 可能为空：viewer id 由本地 user 镜像兜底，写入不依赖 session。
  // 必须是 state 而非 ref：表情按钮要按它判断「这枚是不是我加的」⇒ 渲染期读取。
  const [viewerId, setViewerId] = useState<string | null>(null);
  // G74：解决者的显示名（userId → name），用于已解决区那句「[0]标记为已解决」。
  const [userNameById, setUserNameById] = useState<Map<string, string>>(new Map());

  const reload = useCallback(async () => {
    const [pendingThreads, pendingComments, pendingReactions, userRows] = await Promise.all([
      readPendingRows('comment_thread'),
      readPendingRows('comment'),
      readPendingRows('comment_reaction'),
      readLocalRecords('user'),
    ]);
    const resolvedViewerId = pickViewerId(userId, userRows);
    setViewerId(resolvedViewerId);
    // G74：解决者显示名——从本机 user 镜像取（离线也拿得到）。
    const names = new Map<string, string>();
    for (const row of userRows as Record<string, unknown>[]) {
      const id = typeof row.id === 'string' ? row.id : '';
      const name = typeof row.name === 'string' && row.name ? row.name : '';
      if (id && name) names.set(id, name);
    }
    setUserNameById(names);
    let serverThreads: ThreadView[] = [];
    try {
      serverThreads = (await getThreads(documentId)) as ThreadView[];
    } catch {
      // 离线：服务端读不到，退回本地 pending overlay，本地写入仍可见
    }
    setThreads(toRows(overlayCommentThreads(serverThreads, pendingThreads, pendingComments, pendingReactions, resolvedViewerId)));
  }, [documentId, userId]);

  useEffect(() => {
    void (async () => {
      await reload();
    })();
  }, [reload]);

  useEffect(() => getSyncManager().onStoreChanged((table) => {
    if (table === 'comment' || table === 'comment_thread') void reload();
  }), [reload]);

  // 添加评论 from the block menu opens this composer and names the block it is about.
  const commentRequest = useCommentRequestStore((state) => state.request);
  // 请求号变化时在渲染期调整（与 DocumentEditor 同一写法），不在 effect 里同步 setState。
  const [syncedCommentRequest, setSyncedCommentRequest] = useState(commentRequest);
  if (syncedCommentRequest !== commentRequest) {
    setSyncedCommentRequest(commentRequest);
    if (commentRequest !== 0) setShowComposer(true);
  }

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
    // G1609: the composer opens offline (the entry is never gated); **submitting** is where the
    // gate sits. ★ The official shows the sentence **inline next to the body**, not as a toast and
    // not as a dialog (`dialogs:[]` / `toasts:[]` stayed empty through the whole probe).
    if (!commentSubmitAllowed(navigator.onLine)) {
      setOfflineNotice(offlineCommentMessage());
      return;
    }
    setOfflineNotice(null);
    const { from, to } = editor.state.selection;

    // 找到选区起点所在最底层 block 作为锚点
    const parent = editor.state.doc.resolve(from).parent;
    const named = useCommentRequestStore.getState().blockText;
    const blockText = named || parent.textBetween(0, parent.content.size, '\n', '');
    useCommentRequestStore.getState().clear();

    try {
      const body = draft.slice(0, 2000);
      // 线程 + 首条回复 → applyLocal（本地 id，先落地再推送）。
      // userId 只作本地乐观标记；服务端会按会话覆盖，缺了也不影响推送。
      const actorId = viewerId ?? userId ?? null;
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
        patch: { threadId, ...(actorId ? { userId: actorId } : {}), body },
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
    // G134: replying to a resolved thread reopens it.
    const wasResolved = Boolean(threads.find((thread) => thread.id === threadId)?.resolved);
    // G1609：回复走同一道提交门，同样用内联文案。
    if (!commentSubmitAllowed(navigator.onLine)) {
      setOfflineNotice(offlineCommentMessage());
      return;
    }
    setOfflineNotice(null);
    try {
      const text = body.slice(0, 2000);
      const actorId = viewerId ?? userId ?? null;
      await getSyncManager().applyLocal({
        table: 'comment',
        id: crypto.randomUUID(),
        patch: { threadId, ...(actorId ? { userId: actorId } : {}), body: text },
      });
      setReplyDrafts((prev) => ({ ...prev, [threadId]: '' }));
      if (wasResolved) {
        await getSyncManager().applyLocal({
          table: 'comment_thread',
          id: threadId,
          patch: { resolved: false },
        });
        toast.add({ id: `thread-resolve-${threadId}`, type: 'success', title: THREAD_UNRESOLVED_TOAST });
      }
      await reload();
    } catch {
      // 提交失败保持草稿
    }
  };

  const handleReact = async (comment: CommentRow, glyph: string) => {
    const actorId = viewerId ?? userId ?? null;
    if (!actorId) return;
    if (!navigator.onLine) return;
    const name = session?.user?.name ?? session?.user?.email ?? '';
    // G1640：表情是每人一行——已加过就墓碑那一行，没加过就新建一行（行 id 由本机生成）。
    // 两个分支各写一份字面量 patch：静态那道闸（G1489）要能逐键核对白名单。
    const existingId = reactionRowId(comment.reactions, actorId, glyph);
    const manager = getSyncManager();
    try {
      if (existingId) {
        await manager.applyLocal({
          table: 'comment_reaction',
          id: existingId,
          // commentId 两档都带：墓碑那一笔也要能挂回哪条评论（overlay 按它归属）。
          patch: { commentId: comment.id, deletedAt: new Date().toISOString() },
        });
      } else {
        await manager.applyLocal({
          table: 'comment_reaction',
          id: crypto.randomUUID(),
          patch: { commentId: comment.id, glyph, name },
        });
      }
      await reload();
    } catch {
      // 表情没写上就保持原样
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
      toast.add({
        id: `thread-resolve-${threadId}`,
        type: 'success',
        title: resolved ? THREAD_RESOLVED_TOAST : THREAD_UNRESOLVED_TOAST,
      });
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

      {hasSelection && canComment && !showComposer && (
        <button
          type="button"
          onClick={() => setShowComposer(true)}
          className="mb-2 w-full rounded-md border border-foreground/10 px-2 py-1.5 text-meta transition-colors duration-150 ease-craft hover:bg-foreground/4"
        >
          评论所选文本
        </button>
      )}
      {showComposer && canComment && (
        <div className="mb-2 rounded-md border border-foreground/10 p-2">
          {/* G1609：离线提交被拦的那句挂在正文侧（内联），不是 toast、不是弹窗。 */}
          {offlineNotice && (
            <p role="status" data-testid="comment-offline-notice" className="mb-1 text-[12px] text-destructive">
              {offlineNotice}
            </p>
          )}
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setDraftCaret(event.target.selectionStart ?? event.target.value.length);
            }}
            onSelect={(event) => setDraftCaret(event.currentTarget.selectionStart ?? draft.length)}
            onKeyDown={(event) => {
              const action = composerKey({
                key: event.key,
                shiftKey: event.shiftKey,
                metaKey: event.metaKey,
                ctrlKey: event.ctrlKey,
                altKey: event.altKey,
                draft,
              });
              if (action === 'ignore') return;
              event.preventDefault();
              if (action === 'send') void handleCreate();
              else {
                const field = event.currentTarget;
                const next = `${draft.slice(0, field.selectionStart)}${'\n'}${draft.slice(field.selectionEnd)}`;
                setDraft(next);
              }
            }}
            rows={2}
            placeholder="写下评论..."
            className="w-full resize-none rounded-md border border-foreground/10 bg-transparent p-2 text-meta outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <EmojiSuggest
            draft={draft}
            caret={draftCaret}
            onAccept={(next) => {
              setDraft(next.draft);
              setDraftCaret(next.caret);
            }}
          />
          <MentionSuggest
            documentId={documentId}
            draft={draft}
            caret={draftCaret}
            onAccept={(next) => {
              setDraft(next.draft);
              setDraftCaret(next.caret);
            }}
          />
          {/* G320: the four official hints carry `<highlight>` tags — rendered via RichText so the
              tags become highlights rather than leaking into the UI. */}
          <div className="mt-1.5 space-y-0.5" data-testid="comment-hints">
            <RichText
              value={commentHintEmoji(':')}
              className="block text-[11px] leading-4 text-foreground/45"
            />
            <RichText
              value={COMMENT_HINT_MENTION.template}
              className="block text-[11px] leading-4 text-foreground/45"
            />
            <RichText
              value={COMMENT_HINT_NEW_LINE.template}
              className="block text-[11px] leading-4 text-foreground/45"
            />
            <RichText
              value={COMMENT_HINT_SEND.template}
              className="block text-[11px] leading-4 text-foreground/45"
            />
          </div>
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
              className="rounded-lg bg-craft-accent px-3 py-1 text-meta font-medium text-white transition-colors duration-150 ease-craft hover:bg-craft-accent-hover"
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
                <span className="min-w-0 flex-1">
                  {comment.body}
                  {groupReactions(comment.reactions).length > 0 && (
                    <span className="mt-0.5 block text-foreground/45">
                      {groupReactions(comment.reactions).map(reactionSentence).join('，')}
                    </span>
                  )}
                </span>
                {REACTION_CHOICES.map((glyph) => {
                  const mine = comment.reactions.some(
                    (reaction) => reaction.userId === (viewerId ?? userId) && reaction.glyph === glyph,
                  );
                  return (
                    <button
                      key={glyph}
                      type="button"
                      aria-label="添加表情"
                      disabled={offline}
                      title={offline ? offlineReactionMessage(mine) : undefined}
                      onClick={() => void handleReact(comment, glyph)}
                      className="rounded px-0.5 opacity-0 group-hover:opacity-100"
                    >
                      {glyph}
                    </button>
                  );
                })}
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
            <div className="mt-1.5">
            <div className="flex items-center gap-1">
              <input
                value={replyDrafts[thread.id] ?? ''}
                onChange={(event) => {
                  setReplyDrafts((prev) => ({ ...prev, [thread.id]: event.target.value }));
                  setReplyCarets((prev) => ({
                    ...prev,
                    [thread.id]: event.target.selectionStart ?? event.target.value.length,
                  }));
                }}
                onSelect={(event) =>
                  setReplyCarets((prev) => ({
                    ...prev,
                    [thread.id]: event.currentTarget.selectionStart ?? 0,
                  }))
                }
                onKeyDown={(event) => {
                  if (
                    composerKey({
                      key: event.key,
                      shiftKey: event.shiftKey,
                      metaKey: event.metaKey,
                      ctrlKey: event.ctrlKey,
                      altKey: event.altKey,
                      draft: replyDrafts[thread.id] ?? '',
                    }) !== 'send'
                  ) {
                    return;
                  }
                  event.preventDefault();
                  void handleReply(thread.id);
                }}
                placeholder={thread.resolved ? TYPE_TO_UNRESOLVE : '回复...'}
                className="flex-1 rounded-md border border-foreground/10 bg-transparent px-2 py-1 text-meta outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <button
                type="button"
                disabled={!replyDrafts[thread.id]?.trim()}
                onClick={() => void handleReply(thread.id)}
                className="rounded-md px-2 py-1 text-meta font-medium text-craft-accent transition-colors duration-150 ease-craft hover:bg-craft-accent/12"
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
              <EmojiSuggest
                draft={replyDrafts[thread.id] ?? ''}
                caret={replyCarets[thread.id] ?? (replyDrafts[thread.id]?.length ?? 0)}
                onAccept={(next) => {
                  setReplyDrafts((prev) => ({ ...prev, [thread.id]: next.draft }));
                  setReplyCarets((prev) => ({ ...prev, [thread.id]: next.caret }));
                }}
              />
              <MentionSuggest
                documentId={documentId}
                draft={replyDrafts[thread.id] ?? ''}
                caret={replyCarets[thread.id] ?? (replyDrafts[thread.id]?.length ?? 0)}
                onAccept={(next) => {
                  setReplyDrafts((prev) => ({ ...prev, [thread.id]: next.draft }));
                  setReplyCarets((prev) => ({ ...prev, [thread.id]: next.caret }));
                }}
              />
            </div>
          </div>
        ))}
        {resolvedThreads.length > 0 && (
          <details className="group" open={showResolved} onToggle={(e) => setShowResolved((e.target as HTMLDetailsElement).open)}>
            {/* G74：官方是短标签＋长说明两套（R26）；展开时标签翻成「隐藏已解决」。 */}
            <summary
              title={resolvedToggleHint(showResolved)}
              className="cursor-pointer text-meta text-foreground/40 transition-colors hover:text-foreground/70"
            >
              {`${resolvedToggleLabel(showResolved)} (${resolvedThreads.length})`}
            </summary>
            {resolvedThreads.map((thread) => {
              // G74：官方已解决区显示「[0]标记为已解决」——拿不到名字就不发明半句。
              const by = resolvedByText(thread.resolvedBy ? userNameById.get(thread.resolvedBy) : null);
              return (
                <div
                  key={thread.id}
                  className="mt-1 flex items-center justify-between rounded-md border border-foreground/10 p-2 opacity-60"
                >
                  <div className="min-w-0">
                    <span className="line-clamp-1 text-meta">{thread.comments[0]?.body}</span>
                    {by && <p className="text-[11px] text-foreground/40">{by}</p>}
                  </div>
                  <button
                    type="button"
                    title="重新打开"
                    onClick={() => void handleResolve(thread.id, false)}
                    className="p-1 text-foreground/40 transition-colors duration-150 ease-craft hover:bg-foreground/4 hover:text-foreground/85"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </details>
        )}
      </div>
    </section>
  );
}
