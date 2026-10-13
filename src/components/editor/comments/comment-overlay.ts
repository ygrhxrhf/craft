import { mergePending, type PendingRow } from '@/components/sync/local-records';

export interface CommentView {
  id: string;
  threadId: string;
  userId: string;
  body: string;
  createdAt: string;
  mine: boolean;
  deletedAt: string | null;
}

export interface ThreadView {
  id: string;
  documentId: string;
  blockId: string | null;
  blockText: string;
  resolved: boolean;
  createdAt: string;
  deletedAt: string | null;
  comments: CommentView[];
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function byCreated(a: { createdAt: string }, b: { createdAt: string }): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/**
 * 把未推送的 comment_thread / comment 盖到 getThreads 的结果上。
 * 这两张表没有 isDeleted：软删是 upsert `{ deletedAt }`，合并后再丢掉墓碑行。
 * delete op（patch:null）也会丢掉，避免把行从同步流里抹掉却还留在面板上。
 */
export function overlayCommentThreads(
  serverThreads: ThreadView[],
  pendingThreads: Map<string, PendingRow>,
  pendingComments: Map<string, PendingRow>,
  viewerId: string | null,
): ThreadView[] {
  const serverComments: CommentView[] = [];
  for (const thread of serverThreads) {
    for (const comment of thread.comments) {
      serverComments.push({ ...comment, threadId: comment.threadId || thread.id });
    }
  }

  const threads = mergePending(serverThreads, pendingThreads, (id, pending) => ({
    id,
    documentId: str(pending.data?.documentId),
    blockId: strOrNull(pending.data?.blockId),
    blockText: str(pending.data?.blockText),
    resolved: pending.data?.resolved === true,
    createdAt: pending.syncTs,
    deletedAt: null,
    comments: [],
  })).filter((thread) => !thread.deletedAt);

  const liveThreadIds = new Set(threads.map((thread) => thread.id));

  const comments = mergePending(serverComments, pendingComments, (id, pending) => {
    const userId = str(pending.data?.userId);
    return {
      id,
      threadId: str(pending.data?.threadId),
      userId,
      body: str(pending.data?.body),
      createdAt: pending.syncTs,
      mine: viewerId !== null && userId === viewerId,
      deletedAt: null,
    };
  })
    .filter((comment) => !comment.deletedAt && liveThreadIds.has(comment.threadId))
    .map((comment) => ({ ...comment, mine: viewerId !== null && comment.userId === viewerId }))
    .sort(byCreated);

  const byThread = new Map<string, CommentView[]>();
  for (const comment of comments) {
    const list = byThread.get(comment.threadId) ?? [];
    list.push(comment);
    byThread.set(comment.threadId, list);
  }

  return threads
    .map((thread) => ({ ...thread, comments: byThread.get(thread.id) ?? [] }))
    .filter((thread) => thread.comments.length > 0)
    .sort((a, b) => byCreated(
      { createdAt: a.comments[0]?.createdAt ?? a.createdAt },
      { createdAt: b.comments[0]?.createdAt ?? b.createdAt },
    ));
}
