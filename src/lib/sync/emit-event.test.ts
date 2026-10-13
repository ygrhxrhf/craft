import { describe, it, expect, vi } from 'vitest';
import { emitSyncEvent } from './emit-event';

describe('emitSyncEvent', () => {
  it('以同一 db 句柄 INSERT（与业务同事务语义）', async () => {
    const create = vi.fn(async () => ({}));
    const db = { orm: { public: { SyncEvent: { create } } } };
    await emitSyncEvent(db, 'u1', ['document'], { ts: '2026-09-28T10:03:00.123Z', id: 'x' });
    expect(create).toHaveBeenCalledWith({
      tables: ['document'],
      cursor: '2026-09-28T10:03:00.123Z|x',
      userId: 'u1',
    });
  });
});
