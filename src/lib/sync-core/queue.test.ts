import { describe, it, expect, vi } from 'vitest';
import { createQueue } from './queue';
import { createMemoryStore } from './store';

const NOW = '2026-09-28T10:00:00.000Z';
const mk = async () => {
  const s = createMemoryStore(); await s.init();
  return s;
};

describe('queue.flush', () => {
  it('按 200 分批、folder 排前、成功 ack、响应 rejected 交给上层回调', async () => {
    const store = await mk();
    for (let i = 0; i < 3; i++) await store.enqueue({
      table: 'document', recordId: `d${i}`, op: 'upsert',
      payload: { data: { title: `t${i}` }, syncTs: NOW }, createdAt: NOW });
    await store.enqueue({
      table: 'folder', recordId: 'f1', op: 'upsert',
      payload: { data: { name: 'n' }, syncTs: NOW }, createdAt: NOW });

    const calls: any[] = [];
    const fetchImpl = vi.fn(async (_url: any, init: any) => {
      calls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ applied: [], rejected: [], cursor: NOW + '|z' }),
        { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const q = createQueue(store, { fetchImpl: fetchImpl as any });
    const result = await q.flush();

    expect(result.status).toBe('ok');
    const batch = calls[0].records;
    expect(batch[0].table).toBe('folder');   // folder 优先
    expect(await store.countPending()).toBe(0);
  });

  it('网络错误 → status=network，队列保留', async () => {
    const store = await mk();
    await store.enqueue({ table: 'folder', recordId: 'f1', op: 'upsert', payload: { syncTs: NOW }, createdAt: NOW });
    const q = createQueue(store, { fetchImpl: (async () => { throw new TypeError('offline'); }) as any });
    expect((await q.flush()).status).toBe('network');
    expect(await store.countPending()).toBe(1);
  });

  it('401 → status=auth（上层暂停而非重试）；400 → status=http', async () => {
    const store = await mk();
    await store.enqueue({ table: 'folder', recordId: 'f1', op: 'upsert', payload: { syncTs: NOW }, createdAt: NOW });
    const q401 = createQueue(store, { fetchImpl: (async () => new Response('{}', { status: 401 })) as any });
    expect((await q401.flush()).status).toBe('auth');
    const q400 = createQueue(store, { fetchImpl: (async () => new Response('{}', { status: 400 })) as any });
    expect((await q400.flush()).status).toBe('http');
    expect(await store.countPending()).toBe(1);   // 非 ok 都不 ack
  });
});
