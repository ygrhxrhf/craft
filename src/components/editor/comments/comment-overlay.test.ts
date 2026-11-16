import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PendingRow } from '@/components/sync/local-records';
import { overlayCommentThreads, pickViewerId, type ThreadView } from './comment-overlay';

const comment = (id: string, threadId: string, body: string, userId = 'u1', createdAt = '2026-10-13T00:00:01.000Z') => ({
  id,
  threadId,
  userId,
  body,
  createdAt,
  mine: userId === 'u1',
  deletedAt: null,
});

const thread = (id: string, comments: ReturnType<typeof comment>[], extra: Partial<ThreadView> = {}): ThreadView => ({
  id,
  documentId: 'doc',
  blockId: null,
  blockText: '选区',
  resolved: false,
  resolvedBy: null,
  createdAt: '2026-10-13T00:00:00.000Z',
  deletedAt: null,
  comments,
  ...extra,
});

const upsert = (data: Record<string, unknown>, syncTs = '2026-10-13T01:00:00.000Z'): PendingRow =>
  ({ op: 'upsert', data, syncTs });

/** G1640 起 overlay 多收一份「本机未推送的表情行」（键＝`comment_reaction` 行 id）。 */
const NONE = new Map<string, PendingRow>();

describe('overlayCommentThreads', () => {
  it('本地新建线程和首条评论立刻出现', () => {
    const out = overlayCommentThreads(
      [],
      new Map([['t-new', upsert({ documentId: 'doc', blockText: '离线', resolved: false })]]),
      new Map([['c-new', upsert({ threadId: 't-new', userId: 'u1', body: '第一条' })]]),
      NONE,
      'u1',
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('t-new');
    expect(out[0].blockText).toBe('离线');
    expect(out[0].comments[0]).toMatchObject({ id: 'c-new', body: '第一条', mine: true });
  });

  it('本地回复盖在服务端线程上，解决态覆盖服务端', () => {
    const out = overlayCommentThreads(
      [thread('t1', [comment('c1', 't1', '原文')])],
      new Map([['t1', upsert({ resolved: true })]]),
      new Map([['c2', upsert({ threadId: 't1', userId: 'u2', body: '回复' }, '2026-10-13T00:00:02.000Z')]]),
      NONE,
      'u1',
    );
    expect(out[0].resolved).toBe(true);
    expect(out[0].comments.map((row) => row.body)).toEqual(['原文', '回复']);
    expect(out[0].comments[1].mine).toBe(false);
  });

  it('软删评论后从视图消失；删光后线程也不再出现', () => {
    const out = overlayCommentThreads(
      [thread('t1', [
        comment('c1', 't1', '原文', 'u1', '2026-10-13T00:00:01.000Z'),
        comment('c2', 't1', '还在', 'u1', '2026-10-13T00:00:02.000Z'),
      ])],
      new Map(),
      new Map([['c1', upsert({ deletedAt: '2026-10-13T02:00:00.000Z' })]]),
      NONE,
      'u1',
    );
    expect(out[0].comments.map((row) => row.id)).toEqual(['c2']);

    const emptied = overlayCommentThreads(
      [thread('t1', [comment('c1', 't1', '原文')])],
      new Map([['t1', upsert({ deletedAt: '2026-10-13T02:00:00.000Z' })]]),
      new Map([['c1', upsert({ deletedAt: '2026-10-13T02:00:00.000Z' })]]),
      NONE,
      'u1',
    );
    expect(emptied).toEqual([]);
  });

  it('服务端已软删的线程和评论不进入视图', () => {
    const out = overlayCommentThreads(
      [thread('t1', [comment('c1', 't1', '已删')], { deletedAt: '2026-10-13T02:00:00.000Z' })],
      new Map(),
      new Map(),
      NONE,
      'u1',
    );
    expect(out).toEqual([]);
  });
});

/**
 * G1640：表情按人一行（`comment_reaction`）。本机刚点的表情还没推上去时，服务端那一份里没有
 * 它——overlay 要按 `commentId` 把 pending 的表情行并进来；墓碑行（本机刚取消）直接去掉。
 */
describe('overlayCommentThreads — 未推送的表情行', () => {
  const withReaction = (reactions: Array<{ id: string; glyph: string; userId: string; name: string }>) =>
    thread('t1', [{ ...comment('c1', 't1', '原文'), reactions } as never]);

  it('本机新加的表情立刻出现在那条评论上', () => {
    const out = overlayCommentThreads(
      [withReaction([])],
      new Map(),
      new Map(),
      new Map([['r-new', upsert({ commentId: 'c1', glyph: '👍', name: '张三' })]]),
      'u1',
    );
    expect(out[0].comments[0].reactions).toEqual([
      { id: 'r-new', glyph: '👍', userId: 'u1', name: '张三' },
    ]);
  });

  it('本机取消的表情立刻从那条评论上消失（墓碑行）', () => {
    // 客户端给墓碑那一笔也带 commentId——overlay 按它把行归回哪条评论。
    const out = overlayCommentThreads(
      [withReaction([{ id: 'r1', glyph: '👍', userId: 'u1', name: '张三' }])],
      new Map(),
      new Map(),
      new Map([['r1', upsert({ commentId: 'c1', deletedAt: '2026-10-13T02:00:00.000Z' })]]),
      'u1',
    );
    expect(out[0].comments[0].reactions).toEqual([]);
  });

  it('别人的表情不受本机 pending 影响', () => {
    const out = overlayCommentThreads(
      [withReaction([
        { id: 'r1', glyph: '👍', userId: 'u1', name: '张三' },
        { id: 'r2', glyph: '🎉', userId: 'u2', name: '李四' },
      ])],
      new Map(),
      new Map(),
      new Map([['r3', upsert({ commentId: 'c1', glyph: '❤️', name: '张三' })]]),
      'u1',
    );
    expect(out[0].comments[0].reactions?.map((row) => row.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('pending 行缺 commentId（脏数据）不砸视图', () => {
    const out = overlayCommentThreads(
      [withReaction([])],
      new Map(),
      new Map(),
      new Map([['r-x', upsert({ glyph: '👍' })]]),
      'u1',
    );
    expect(out[0].comments[0].reactions).toEqual([]);
  });
});

describe('pickViewerId', () => {
  it('session 就绪时直接用 session 的 id', () => {
    expect(pickViewerId('u1', [])).toBe('u1');
  });

  it('session 为空时退回本地 user 镜像', () => {
    expect(pickViewerId(null, [{ id: 'u9', op: 'upsert' }])).toBe('u9');
  });

  it('镜像里只有墓碑行时不给 id', () => {
    expect(pickViewerId(undefined, [{ id: 'u9', op: 'delete' }])).toBeNull();
  });
});

/**
 * G1641 —— 表情拆表后（G1640）订阅面要跟着扩。`CommentSection` 的 store 订阅此前只看
 * `comment`／`comment_thread`：本机点表情时它自己会 reload，所以看不出来漏；另一台设备
 * 拉回来的表情行走到这里就被丢了，面板停在旧状态。这类"拆表后订阅没跟"的洞静态闸能钉死。
 */
describe('CommentSection 的 store 订阅（G1641）', () => {
  const src = readFileSync(
    join(process.cwd(), 'src', 'components', 'editor', 'comments', 'CommentSection.tsx'),
    'utf8',
  );

  it('订阅三个表：comment / comment_thread / comment_reaction', () => {
    expect(src).toContain("table === 'comment'");
    expect(src).toContain("table === 'comment_thread'");
    expect(src, '拆表后漏订阅 comment_reaction ⇒ 另一台设备拉到的表情不刷新面板')
      .toContain("table === 'comment_reaction'");
  });

  it('读 pending 也覆盖 comment_reaction（本机未推送的表情要能立刻看见）', () => {
    expect(src).toContain("readPendingRows('comment_reaction')");
  });

  it('写路径按行 toggle：有行→墓碑、无行→新建（两个分支各自字面量 patch）', () => {
    expect(src).toContain("table: 'comment_reaction'");
    expect(src).toContain('reactionRowId(comment.reactions');
    // 墓碑分支与新建分支各出现一次 comment_reaction 的 applyLocal
    const occurrences = src.match(/table: 'comment_reaction'/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
  });
});
