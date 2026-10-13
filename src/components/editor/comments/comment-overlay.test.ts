import { describe, expect, it } from 'vitest';
import type { PendingRow } from '@/components/sync/local-records';
import { overlayCommentThreads, type ThreadView } from './comment-overlay';

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
  createdAt: '2026-10-13T00:00:00.000Z',
  deletedAt: null,
  comments,
  ...extra,
});

const upsert = (data: Record<string, unknown>, syncTs = '2026-10-13T01:00:00.000Z'): PendingRow =>
  ({ op: 'upsert', data, syncTs });

describe('overlayCommentThreads', () => {
  it('本地新建线程和首条评论立刻出现', () => {
    const out = overlayCommentThreads(
      [],
      new Map([['t-new', upsert({ documentId: 'doc', blockText: '离线', resolved: false })]]),
      new Map([['c-new', upsert({ threadId: 't-new', userId: 'u1', body: '第一条' })]]),
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
      'u1',
    );
    expect(out[0].comments.map((row) => row.id)).toEqual(['c2']);

    const emptied = overlayCommentThreads(
      [thread('t1', [comment('c1', 't1', '原文')])],
      new Map([['t1', upsert({ deletedAt: '2026-10-13T02:00:00.000Z' })]]),
      new Map([['c1', upsert({ deletedAt: '2026-10-13T02:00:00.000Z' })]]),
      'u1',
    );
    expect(emptied).toEqual([]);
  });

  it('服务端已软删的线程和评论不进入视图', () => {
    const out = overlayCommentThreads(
      [thread('t1', [comment('c1', 't1', '已删')], { deletedAt: '2026-10-13T02:00:00.000Z' })],
      new Map(),
      new Map(),
      'u1',
    );
    expect(out).toEqual([]);
  });
});
