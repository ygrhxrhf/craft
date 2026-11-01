import { describe, expect, it } from 'vitest';
import { resolveConflict, type PendingIntentLike } from './conflict-resolve';
import type { SyncRecord } from './types';

const pending = (over: Partial<PendingIntentLike> = {}): PendingIntentLike => ({
  table: 'document',
  recordId: 'd1',
  op: 'upsert',
  payload: { data: { title: '本地标题' }, syncTs: '2026-11-01T10:00:02.000Z' },
  ...over,
});

const server = (over: Partial<SyncRecord> = {}): SyncRecord => ({
  table: 'document',
  id: 'd1',
  op: 'upsert',
  data: { title: '服务端标题', icon: '📄' },
  syncTs: '2026-11-01T10:00:01.000Z',
  ...over,
});

describe('resolveConflict（G440/G441/G442）', () => {
  it('没有未上报改动 ⇒ 服务端为准（adopt）', () => {
    const out = resolveConflict({ table: 'document', id: 'd1', server: server(), localMirror: null, pending: null });
    expect(out.decision).toBe('adopt');
  });

  it('服务端补丁不落后（本地那笔更旧）⇒ adopt，不无谓合并', () => {
    const out = resolveConflict({
      table: 'document',
      id: 'd1',
      server: server({ syncTs: '2026-11-01T10:00:09.000Z' }),
      localMirror: null,
      pending: pending({ payload: { data: { title: '本地标题' }, syncTs: '2026-11-01T10:00:02.000Z' } }),
    });
    expect(out.decision).toBe('adopt');
  });

  it('墓碑不参与逐槽合并（delete 那一笔 adopt）', () => {
    const out = resolveConflict({
      table: 'document',
      id: 'd1',
      server: server({ op: 'delete', data: undefined }),
      localMirror: null,
      pending: pending(),
    });
    expect(out.decision).toBe('adopt');
  });

  it('本地改了一格、服务端改了另一格 ⇒ 两格都保留', () => {
    const out = resolveConflict({
      table: 'document',
      id: 'd1',
      // 服务端只改了 icon（title 与祖先同值）
      server: server({ data: { title: '原标题', icon: '⭐' } }),
      // 祖先：title='原标题'、icon='📄'
      localMirror: { table: 'document', id: 'd1', op: 'upsert', data: { title: '原标题', icon: '📄' }, syncTs: 'x' },
      // 本地只改了 title（icon 与祖先同值）
      pending: pending({ payload: { data: { title: '本地标题', icon: '📄' }, syncTs: '2026-11-01T10:00:02.000Z' } }),
    });
    expect(out.decision).toBe('merge');
    if (out.decision !== 'merge') return;
    // 本地只动了 title ⇒ title 取本地；服务端只动了 icon ⇒ icon 取服务端
    expect(out.data.title).toBe('本地标题');
    expect(out.data.icon).toBe('⭐');
  });

  it('两侧都改了同一格 ⇒ 服务端胜出（合不出来就回退服务端）', () => {
    const out = resolveConflict({
      table: 'document',
      id: 'd1',
      server: server({ data: { title: '服务端标题' } }),
      localMirror: { table: 'document', id: 'd1', op: 'upsert', data: { title: '原标题' }, syncTs: 'x' },
      pending: pending({ payload: { data: { title: '本地标题' }, syncTs: '2026-11-01T10:00:02.000Z' } }),
    });
    expect(out.decision).toBe('merge');
    if (out.decision !== 'merge') return;
    expect(out.data.title).toBe('服务端标题');
  });

  it('id 是身份，永远取服务端', () => {
    const out = resolveConflict({
      table: 'document',
      id: 'd1',
      server: server({ data: { id: 'd1', title: '服务端标题' } }),
      localMirror: null,
      pending: pending({ payload: { data: { id: 'd1', title: '本地标题' }, syncTs: '2026-11-01T10:00:02.000Z' } }),
    });
    expect(out.decision).toBe('merge');
    if (out.decision !== 'merge') return;
    expect(out.data.id).toBe('d1');
  });

  it('task 表走 mergeTaskData：本地任务字段为最新', () => {
    const out = resolveConflict({
      table: 'task',
      id: 't1',
      server: {
        table: 'task',
        id: 't1',
        op: 'upsert',
        data: { title: '服务端', isCompleted: false },
        syncTs: '2026-11-01T10:00:01.000Z',
      },
      localMirror: null,
      pending: {
        table: 'task',
        recordId: 't1',
        op: 'upsert',
        payload: { data: { title: '本地', isCompleted: true }, syncTs: '2026-11-01T10:00:02.000Z' },
      },
    });
    expect(out.decision).toBe('merge');
    if (out.decision !== 'merge') return;
    expect(out.data).toMatchObject({ title: '本地', isCompleted: true });
  });

  it('collection_item 表：schemas 归属 id 数组合并（两侧新增都在）', () => {
    const out = resolveConflict({
      table: 'collection_item',
      id: 'i1',
      server: {
        table: 'collection_item',
        id: 'i1',
        op: 'upsert',
        data: { id: 'i1', schemas: ['s1'] },
        syncTs: '2026-11-01T10:00:01.000Z',
      },
      localMirror: { table: 'collection_item', id: 'i1', op: 'upsert', data: { id: 'i1', schemas: [] }, syncTs: 'x' },
      pending: {
        table: 'collection_item',
        recordId: 'i1',
        op: 'upsert',
        payload: { data: { id: 'i1', schemas: ['s2'] }, syncTs: '2026-11-01T10:00:02.000Z' },
      },
    });
    expect(out.decision).toBe('merge');
    if (out.decision !== 'merge') return;
    // 服务端归属 s1、本地新增 s2 ⇒ 两条归属都保留（G427 一物多集合）
    expect(out.data.schemas).toEqual(['s1', 's2']);
  });

  it('本地首次见到这一条（祖先为 null）⇒ 仍按判据合并，不崩', () => {
    const out = resolveConflict({
      table: 'document',
      id: 'd1',
      server: server(),
      localMirror: null,
      pending: pending(),
    });
    expect(out.decision).toBe('merge');
  });
});
