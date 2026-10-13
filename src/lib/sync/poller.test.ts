// src/lib/sync/poller.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createPoller } from './poller';

describe('sync_events 轮询器', () => {
  it('取到事件 → 分发给订阅者 → 删除已处理行', async () => {
    const rows = [{ id: 7, userId: 'u1', tables: ['document'], cursor: '2026-09-28T10:00:00.000Z|x' }];
    const chain = {
      where: () => chain, orderBy: () => chain, limit: () => Promise.resolve(rows),
      all: () => Promise.resolve(rows), delete: vi.fn(async () => ({})),
    };
    const db = { orm: { public: { SyncEvent: chain } } };
    const seen: any[] = [];
    const poller = createPoller(() => Promise.resolve(db), (userId, msg) => { seen.push([userId, msg]); });
    await poller.tick();
    expect(seen).toEqual([['u1', { t: 'meta', tables: ['document'], cursor: '2026-09-28T10:00:00.000Z|x' }]]);
    expect(chain.delete).toHaveBeenCalled();
  });

  it('tick 异常不抛出（自恢复）', async () => {
    const db = { orm: { public: { SyncEvent: { where: () => { throw new Error('db down'); } } } } };
    const poller = createPoller(() => Promise.resolve(db), () => {});
    await expect(poller.tick()).resolves.toBeUndefined();
  });
});
