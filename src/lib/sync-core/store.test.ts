import 'fake-indexeddb/auto';   // 文件头，为 idb 提供全局
import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryStore } from './store';
import type { SyncStore } from './store';
import { createIdbStore, SYNC_DB_NAME } from './adapter-idb';

// idb 跨用例持久，删库隔离；memory 实例天然隔离（deleteDatabase 为无害空操作）
function deleteIdb(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(SYNC_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

const rec = (id: string, ts: string, title = 'a') => ({
  table: 'document', id, op: 'upsert' as const,
  data: { title }, syncTs: ts,
});

describe.each([
  ['memory', createMemoryStore],
  ['idb', createIdbStore],
])('SyncStore 契约（%s，MemoryStore 与 adapter-idb 共用同一套用例）', (_label, factory) => {
  let s: SyncStore;
  beforeEach(async () => {
    await deleteIdb();
    s = factory();
    await s.init();
  });

  it('applyRemote upsert 合并、delete 标墓碑', async () => {
    await s.applyRemote([rec('d1', '2026-09-28T10:00:00.000Z', 'v1')]);
    await s.applyRemote([rec('d1', '2026-09-28T10:00:01.000Z', 'v2')]);
    expect((await s.get('document', 'd1'))?.data?.title).toBe('v2');
    await s.applyRemote([{ table: 'document', id: 'd1', op: 'delete', syncTs: '2026-09-28T10:00:02.000Z' }]);
    const row = await s.get('document', 'd1');
    expect(row?.op).toBe('delete');
  });

  it('同 record 连续入队合并为最后一条', async () => {
    const base = { table: 'document', recordId: 'd1', op: 'upsert' as const };
    await s.enqueue({ ...base, payload: { data: { title: 'a' }, syncTs: '2026-09-28T10:00:00.000Z' }, createdAt: '2026-09-28T10:00:00.000Z' });
    await s.enqueue({ ...base, payload: { data: { title: 'b' }, syncTs: '2026-09-28T10:00:01.000Z' }, createdAt: '2026-09-28T10:00:01.000Z' });
    expect(await s.countPending()).toBe(1);
    const [op] = await s.peekBatch(10, '2026-09-28T10:00:02.000Z');
    expect(op.payload.data?.title).toBe('b');
  });

  it('peekBatch 尊重 nextRetryAt；ack 清除；cursor 读写', async () => {
    await s.enqueue({ table: 'folder', recordId: 'f1', op: 'upsert', payload: { syncTs: '2026-09-28T10:00:00.000Z' }, createdAt: '2026-09-28T10:00:00.000Z' });
    const [op] = await s.peekBatch(10, '2026-09-28T10:00:00.000Z');
    await s.bumpTry(op.seq, '2026-09-28T10:05:00.000Z');
    expect(await s.peekBatch(10, '2026-09-28T10:01:00.000Z')).toHaveLength(0);
    expect(await s.peekBatch(10, '2026-09-28T10:06:00.000Z')).toHaveLength(1);
    await s.ack([op.seq]);
    expect(await s.countPending()).toBe(0);

    await s.setCursor({ ts: '2026-09-28T10:00:00.000Z', id: 'x' });
    expect(await s.getCursor()).toEqual({ ts: '2026-09-28T10:00:00.000Z', id: 'x' });
  });
});
