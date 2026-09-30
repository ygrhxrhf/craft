import { describe, it, expect, vi } from 'vitest';
import {
  createAttachmentQueue,
  createMemoryAttachmentStore,
  manifestKey,
  BACKOFF_MS,
  MAX_TRIES,
} from './attachment-queue';

const job = (over: Record<string, unknown> = {}) => ({
  id: 'j1', name: 'a.png', size: 3, type: 'image/png', blob: new Blob(['abc']), ...over,
});

async function setup() {
  const store = await createMemoryAttachmentStore();
  const upload = vi.fn(async () => ({ key: 'k1' }));
  const q = createAttachmentQueue({ store, upload });
  return { store, upload, q };
}

describe('attachment-queue', () => {
  it('enqueue 后 pendingCount 递增', async () => {
    const { q } = await setup();
    await q.enqueue(job() as never);
    expect(await q.pendingCount()).toBe(1);
  });

  it('flush 成功调用 upload 并清空队列', async () => {
    const { q, upload } = await setup();
    await q.enqueue(job() as never);
    const r = await q.flush();
    expect(r).toEqual({ uploaded: 1, status: 'ok' });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(await q.pendingCount()).toBe(0);
  });

  it('成功后写已上传清单，同名同尺寸同类型再次入队直接跳过', async () => {
    const { q, upload } = await setup();
    await q.enqueue(job() as never);
    await q.flush();
    expect(await q.isUploaded(manifestKey('a.png', 3, 'image/png'))).toBe(true);
    await q.enqueue(job({ id: 'j2' }) as never);
    const r = await q.flush();
    expect(r.uploaded).toBe(0);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(await q.pendingCount()).toBe(0);
  });

  it('upload 抛错归为 network、保留在队列、tries 递增', async () => {
    const store = await createMemoryAttachmentStore();
    const q = createAttachmentQueue({ store, upload: async () => { throw new Error('offline'); } });
    await q.enqueue(job() as never);
    const r = await q.flush();
    expect(r.status).toBe('network');
    expect(await store.count()).toBe(1);
    const [j] = await store.dueJobs(new Date(Date.now() + 60_000).toISOString());
    expect(j.tries).toBe(1);
  });

  it('未到 nextRetryAt 的任务不会被 dueJobs 取出', async () => {
    const store = await createMemoryAttachmentStore();
    const q = createAttachmentQueue({ store, upload: async () => { throw new Error('x'); } });
    await q.enqueue(job() as never);
    await q.flush();
    expect((await store.dueJobs(new Date().toISOString())).length).toBe(0);
  });

  it('连续 3 次失败后移出队列并触发 onError', async () => {
    const store = await createMemoryAttachmentStore();
    const onError = vi.fn();
    const q = createAttachmentQueue({ store, upload: async () => { throw new Error('x'); }, onError });
    await q.enqueue(job() as never);
    // 时钟必须累加：每轮往后推 10 分钟，后两轮才落在 nextRetryAt 之后、任务才真的被取出。
    let t = Date.parse('2026-09-30T00:00:00.000Z');
    for (let i = 0; i < MAX_TRIES; i++) {
      await q.flush(new Date(t).toISOString());
      t += 10 * 60_000;
    }
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toHaveLength(1);
    expect(await store.count()).toBe(0);
  });

  it('退避阶梯与 P1 sync-core 逐字一致（[2s..300s] 封顶）', async () => {
    expect(BACKOFF_MS).toEqual([2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 128_000, 256_000, 300_000]);
    expect(Math.max(...BACKOFF_MS)).toBe(300_000);
    // 连续失败上限 3 次同样是 spec 常量：前两次退避重试，第 3 次转 error。
    expect(MAX_TRIES).toBe(3);
  });

  it('退避阶梯首档 2s、逐级翻倍', async () => {
    const store = await createMemoryAttachmentStore();
    const q = createAttachmentQueue({ store, upload: async () => { throw new Error('x'); } });
    await q.enqueue(job() as never);
    const delays: number[] = [];
    let t = Date.parse('2026-09-30T00:00:00.000Z');
    for (let i = 0; i < 2; i++) {
      await q.flush(new Date(t).toISOString());
      const [j] = await store.dueJobs(new Date(t + 10_000).toISOString());
      delays.push(Date.parse(j!.nextRetryAt!) - t);
      t += 10 * 60_000;
    }
    expect(delays[0]).toBe(2000);
    expect(delays[1]).toBe(4000);
  });

  it('同 id 重复入队只保留一条', async () => {
    const { store, q } = await setup();
    await q.enqueue(job() as never);
    await q.enqueue(job({ name: 'a2.png' }) as never);
    expect(await store.count()).toBe(1);
  });

  it('多条排队按 createdAt 升序逐条处理', async () => {
    const store = await createMemoryAttachmentStore();
    const seen: string[] = [];
    const q = createAttachmentQueue({
      store,
      upload: async (j) => { seen.push(j.id); return { key: j.id }; },
    });
    await q.enqueue(job({ id: 'j1' }) as never);
    await q.enqueue(job({ id: 'j2', name: 'b.png' }) as never);
    await q.enqueue(job({ id: 'j3', name: 'c.png' }) as never);
    const r = await q.flush();
    expect(seen).toEqual(['j1', 'j2', 'j3']);
    expect(r).toEqual({ uploaded: 3, status: 'ok' });
  });

  it('失败时不写已上传清单（否则会误判为已传）', async () => {
    // 让 upload 第一次失败：用一次调用计数控制
    let n = 0;
    const store = await createMemoryAttachmentStore();
    const q2 = createAttachmentQueue({
      store,
      upload: async () => {
        if (n++ === 0) throw new Error('x');
        return { key: 'k1' };
      },
    });
    await q2.enqueue(job() as never);
    await q2.flush();
    expect(await q2.isUploaded(manifestKey('a.png', 3, 'image/png'))).toBe(false);
    // 退避到期后重试成功，此时才写清单
    await q2.flush(new Date(Date.now() + 60_000).toISOString());
    expect(await q2.isUploaded(manifestKey('a.png', 3, 'image/png'))).toBe(true);
    expect(await store.count()).toBe(0);
  });

  it('markUploaded 可外部登记已上传（迁移脚本回填用）', async () => {
    const { q } = await setup();
    const k = manifestKey('x.pdf', 10, 'application/pdf');
    expect(await q.isUploaded(k)).toBe(false);
    await q.markUploaded(k);
    expect(await q.isUploaded(k)).toBe(true);
  });
});
