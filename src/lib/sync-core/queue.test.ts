import { describe, it, expect, vi } from 'vitest';
import { createQueue } from './queue';
import { createMemoryStore } from './store';

const NOW = '2026-09-28T10:00:00.000Z';
const mk = async () => {
  const s = createMemoryStore(); await s.init();
  return s;
};

const ok = () => new Response(JSON.stringify({ applied: [], rejected: [], cursor: NOW + '|z' }),
  { status: 200, headers: { 'content-type': 'application/json' } });

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
      return ok();
    });
    const onRejected = vi.fn();
    const q = createQueue(store, { fetchImpl: fetchImpl as any, onRejected });
    const result = await q.flush();

    expect(result.status).toBe('ok');
    const batch = calls[0].records;
    expect(batch[0].table).toBe('folder');   // folder 优先
    expect(await store.countPending()).toBe(0);
    expect(onRejected).not.toHaveBeenCalled();
  });

  it('网络错误 → status=network，队列保留', async () => {
    const store = await mk();
    await store.enqueue({ table: 'folder', recordId: 'f1', op: 'upsert', payload: { syncTs: NOW }, createdAt: NOW });
    const q = createQueue(store, { fetchImpl: (async () => { throw new TypeError('offline'); }) as any });
    expect((await q.flush()).status).toBe('network');
    expect(await store.countPending()).toBe(1);
  });

  it('401 → status=auth（上层暂停而非重试），队列保留', async () => {
    const store = await mk();
    await store.enqueue({ table: 'folder', recordId: 'f1', op: 'upsert', payload: { syncTs: NOW }, createdAt: NOW });
    const q401 = createQueue(store, { fetchImpl: (async () => new Response('{}', { status: 401 })) as any });
    expect((await q401.flush()).status).toBe('auth');
    expect(await store.countPending()).toBe(1);   // 非 ok 都不 ack
  });

  // I6/spec 9.2：5xx 与其余失败 → network（上层按退避重试）
  it('I6：500/503 → status=network（触发退避重试）', async () => {
    for (const status of [500, 503]) {
      const store = await mk();
      await store.enqueue({ table: 'folder', recordId: 'f1', op: 'upsert', payload: { syncTs: NOW }, createdAt: NOW });
      const q = createQueue(store, { fetchImpl: (async () => new Response('{}', { status })) as any });
      expect((await q.flush()).status, `status=${status}`).toBe('network');
      expect(await store.countPending()).toBe(1);   // 不 ack，留待重试
    }
  });
});

/**
 * `gap.md` G1630 —— 400/413 此前被当作"程序 bug，不重试"：队列里那批 op 仍在，下一次 flush
 * （任何一次新改动都会触发）还是同一批、还是同一个 4xx ⇒ 队头永久毒死，之后所有改动都排在同一批
 * 后面推不上去，除了「重置文档缓存」（连未同步改动一起丢）没有恢复路径。
 *
 * 服务端这两枚状态码都是**记录级**故障：413＝请求体超 2MB（单笔太大或合计太大），400＝
 * bad records／unknown table／user id mismatch／document_tag 缺复合键（整批里有一笔不合协议）。
 * 修法＝把坏的那一笔隔离出来：批内多笔先对半拆；单笔仍 4xx 就丢掉它并按 `reason:'invalid'`
 * 冒给 UI；响应体不是本服务那几种 JSON（中间层代理返回 HTML）则退回 network 走退避。
 */
describe('G1630：记录级 4xx 逐笔隔离，不毒死队列', () => {
  it('400（bad records）：拆批后好笔落库、坏笔丢弃并冒 invalid，队列清空', async () => {
    const store = await mk();
    await store.enqueue({ table: 'document', recordId: 'good', op: 'upsert',
      payload: { data: { title: 't' }, syncTs: NOW }, createdAt: NOW });
    await store.enqueue({ table: 'document', recordId: 'bad', op: 'upsert',
      payload: { data: { title: 't' }, syncTs: NOW }, createdAt: NOW });

    const seen: string[][] = [];
    const fetchImpl = vi.fn(async (_url: any, init: any) => {
      const ids: string[] = JSON.parse(init.body).records.map((r: any) => r.id);
      seen.push(ids);
      // 只要批里有 bad 就整批 400（服务端 bodySchema 的真实行为）
      return ids.includes('bad')
        ? new Response(JSON.stringify({ error: 'bad records' }), { status: 400 })
        : ok();
    });
    const onRejected = vi.fn();
    const q = createQueue(store, { fetchImpl: fetchImpl as any, onRejected });

    const result = await q.flush();
    expect(result.status).toBe('ok');
    expect(await store.countPending()).toBe(0);          // 坏笔不再卡在队头
    // 先整批发 → 对半拆 → 好笔落库 → 坏笔单独再发一次才判死
    expect(seen).toEqual([['good', 'bad'], ['good'], ['bad']]);
    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(onRejected.mock.calls[0]![0]).toEqual([{
      table: 'document', id: 'bad', op: 'upsert', syncTs: NOW, reason: 'invalid',
    }]);
  });

  it('413（payload too large）：单笔超限被丢弃；别的笔照常落库', async () => {
    const store = await mk();
    await store.enqueue({ table: 'document', recordId: 'huge', op: 'upsert',
      payload: { data: { title: 'x'.repeat(4096) }, syncTs: NOW }, createdAt: NOW });
    await store.enqueue({ table: 'document', recordId: 'small', op: 'upsert',
      payload: { data: { title: 't' }, syncTs: NOW }, createdAt: NOW });

    const fetchImpl = vi.fn(async (_url: any, init: any) => {
      const ids: string[] = JSON.parse(init.body).records.map((r: any) => r.id);
      return ids.includes('huge')
        ? new Response(JSON.stringify({ error: 'payload too large' }), { status: 413 })
        : ok();
    });
    const onRejected = vi.fn();
    const q = createQueue(store, { fetchImpl: fetchImpl as any, onRejected });
    expect((await q.flush()).status).toBe('ok');
    expect(await store.countPending()).toBe(0);
    expect(onRejected.mock.calls.flatMap((c: any[]) => c[0].map((r: any) => r.id))).toEqual(['huge']);
  });

  it('☆ 4xx 但响应体不是本服务的 JSON（代理返回 HTML）→ 退回 network，一笔都不丢', async () => {
    const store = await mk();
    await store.enqueue({ table: 'folder', recordId: 'f1', op: 'upsert', payload: { syncTs: NOW }, createdAt: NOW });
    const q = createQueue(store, {
      fetchImpl: (async () => new Response('<html>Bad Request</html>', { status: 400 })) as any,
    });
    expect((await q.flush()).status).toBe('network');
    expect(await store.countPending()).toBe(1);
  });

  it('拆批途中网络断了 → 已落的不回滚、未落的留在队列（状态 network）', async () => {
    const store = await mk();
    await store.enqueue({ table: 'document', recordId: 'a', op: 'upsert', payload: { syncTs: NOW }, createdAt: NOW });
    await store.enqueue({ table: 'document', recordId: 'b', op: 'upsert', payload: { syncTs: NOW }, createdAt: NOW });
    let calls = 0;
    const fetchImpl = vi.fn(async (_url: any, init: any) => {
      calls++;
      const ids: string[] = JSON.parse(init.body).records.map((r: any) => r.id);
      if (calls === 1) return new Response(JSON.stringify({ error: 'bad records' }), { status: 400 });
      if (ids[0] === 'a') return ok();
      throw new TypeError('offline');
    });
    const q = createQueue(store, { fetchImpl: fetchImpl as any });
    expect((await q.flush()).status).toBe('network');
    expect(await store.countPending()).toBe(1);   // a 已 ack，b 还在
  });
});
