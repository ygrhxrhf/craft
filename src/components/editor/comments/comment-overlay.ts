import { mergePending, type PendingRow } from '@/components/sync/local-records';
import { readReactions, type Reaction } from './reactions';

export interface CommentView {
  id: string;
  threadId: string;
  userId: string;
  body: string;
  reactions?: Reaction[];
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
  /** G74: who resolved it — the resolved section shows 「[0]标记为已解决」. */
  resolvedBy: string | null;
  createdAt: string;
  deletedAt: string | null;
  comments: CommentView[];
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * 当前用户 id：session 就绪时用 session；离线/加载中退回本地 user 镜像。
 * 同步内核只拉本人那一行 user，所以镜像里最多一条活行，其 id 即当前用户。
 */
export function pickViewerId(
  sessionId: string | null | undefined,
  userRows: Array<{ id: string; op: string }>,
): string | null {
  if (sessionId) return sessionId;
  const live = userRows.find((row) => row.op !== 'delete');
  return live ? live.id : null;
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function byCreated(a: { createdAt: string }, b: { createdAt: string }): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/**
 * 把未推送的 comment_thread / comment / comment_reaction 盖到 getThreads 的结果上。
 * 这三张表都没有 isDeleted：软删是 upsert `{ deletedAt }`，合并后再丢掉墓碑行。
 * delete op（patch:null）也会丢掉，避免把行从同步流里抹掉却还留在面板上。
 *
 * G1640：表情是**每人一行**（`comment_reaction`）。本机刚点的表情还没推上去时，服务端那一份
 * 里没有它——按 `commentId` 把 pending 的表情行并进来（墓碑行＝本机刚取消，直接去掉）。
 */
export function overlayCommentThreads(
  serverThreads: ThreadView[],
  pendingThreads: Map<string, PendingRow>,
  pendingComments: Map<string, PendingRow>,
  pendingReactions: Map<string, PendingRow>,
  viewerId: string | null,
): ThreadView[] {
  const serverComments: CommentView[] = [];
  for (const thread of serverThreads) {
    for (const comment of thread.comments) {
      serverComments.push({
        ...comment,
        threadId: comment.threadId || thread.id,
        reactions: readReactions(comment.reactions),
      });
    }
  }

  const threads = mergePending(serverThreads, pendingThreads, (id, pending) => ({
    id,
    documentId: str(pending.data?.documentId),
    blockId: strOrNull(pending.data?.blockId),
    blockText: str(pending.data?.blockText),
    resolved: pending.data?.resolved === true,
    resolvedBy: strOrNull(pending.data?.resolvedBy),
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
      reactions: [],
      createdAt: pending.syncTs,
      mine: viewerId !== null && userId === viewerId,
      deletedAt: null,
    };
  })
    .filter((comment) => !comment.deletedAt && liveThreadIds.has(comment.threadId))
    .map((comment) => ({ ...comment, mine: viewerId !== null && comment.userId === viewerId }))
    .sort(byCreated);

  // 本机未推送的表情行（新增／取消）——键就是 `comment_reaction` 行 id。
  const pendingByComment = new Map<string, Array<{ id: string; pending: PendingRow }>>();
  for (const [id, pending] of pendingReactions) {
    const commentId = str(pending.data?.commentId);
    if (!commentId) continue;
    const bucket = pendingByComment.get(commentId) ?? [];
    bucket.push({ id, pending });
    pendingByComment.set(commentId, bucket);
  }
  const withReactions = comments.map((comment) => {
    const pendingRows = pendingByComment.get(comment.id) ?? [];
    if (!pendingRows.length) return comment;
    const rows = new Map(comment.reactions?.map((row) => [row.id, row]) ?? []);
    for (const { id, pending } of pendingRows) {
      if (pending.op === 'delete' || pending.data?.deletedAt) rows.delete(id);
      else {
        // pending 行都是**本机**的意图 ⇒ 缺 userId 时就是当前用户（服务端建行时才补 userId）。
        rows.set(id, {
          id,
          glyph: str(pending.data?.glyph),
          userId: str(pending.data?.userId) || viewerId || '',
          name: str(pending.data?.name),
        });
      }
    }
    return { ...comment, reactions: [...rows.values()] };
  });

  const byThread = new Map<string, CommentView[]>();
  for (const comment of withReactions) {
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
