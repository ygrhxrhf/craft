import { describe, it, expect, vi } from 'vitest';
import { directUpload, type PutImpl, type PutResult } from './attachment-client';

const file = (name: string, body = 'hello', type = 'text/plain') =>
  new File([Buffer.from(body, 'utf8')], name, { type });

/** sign 端点的最小响应形状；不是真的 Response，directUpload 只用 ok/status/json 三样。 */
type SignRes = { ok: boolean; status: number; json: () => Promise<unknown> };

const asFetch = (fn: (u: string, i?: unknown) => Promise<SignRes>) => fn as unknown as typeof fetch;

const signOk = (over: Record<string, unknown> = {}) =>
  asFetch(vi.fn(async (): Promise<SignRes> => ({
    ok: true, status: 200,
    json: async () => ({
      uploadUrl: 'https://cos.invalid/put?sig=1', key: 'uuid-1.txt', expiresAt: 4102444800, ...over,
    }),
  })));

const putOk = () =>
  vi.fn<PutImpl>(async (): Promise<PutResult> => ({ ok: true, status: 200 }));

describe('directUpload', () => {
  it('先 sign 再把内容 PUT 到预签名 URL，返回 /api/files/<key>', async () => {
    const putImpl = putOk();
    const r = await directUpload(file('a.txt'), { fetchImpl: signOk(), putImpl });
    expect(putImpl).toHaveBeenCalledTimes(1);
    expect(putImpl.mock.calls[0]![0]).toBe('https://cos.invalid/put?sig=1');
    expect(r).toEqual({ url: '/api/files/uuid-1.txt', name: 'uuid-1.txt', size: 5, type: 'text/plain' });
  });

  it('sign 请求带文件名/大小/类型三个字段', async () => {
    const fetchImpl = signOk();
    await directUpload(file('a.txt', 'hello', 'text/plain'), { fetchImpl, putImpl: putOk() });
    // asFetch 把 fn 转成 typeof fetch 会丢掉 spy 包装，只能再转回来读调用参数。
    const calls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit][];
    const [url, init] = calls[0]!;
    expect(url).toBe('/api/v1/attachments/sign');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'a.txt', size: 5, type: 'text/plain' });
  });

  it('PUT 带与文件一致的 Content-Type', async () => {
    const putImpl = putOk();
    await directUpload(file('a.txt'), { fetchImpl: signOk(), putImpl });
    expect(putImpl.mock.calls[0]![1].headers['Content-Type']).toBe('text/plain');
  });

  it('PUT 的 body 就是原始 File（直传不经过应用服务器）', async () => {
    const f = file('a.txt');
    const putImpl = putOk();
    await directUpload(f, { fetchImpl: signOk(), putImpl });
    expect(putImpl.mock.calls[0]![1].body).toBe(f);
  });

  it('sign 返回 413 时抛出服务端中文错误', async () => {
    const fetchImpl = asFetch(async () => ({
      ok: false, status: 413, json: async () => ({ error: '文件超过 100MB 限制' }),
    }));
    await expect(directUpload(file('a.txt'), { fetchImpl, putImpl: putOk() })).rejects.toThrow(/100MB/);
  });

  it('sign 返回 401 时抛未授权', async () => {
    const fetchImpl = asFetch(async () => ({
      ok: false, status: 401, json: async () => ({ error: '未授权' }),
    }));
    await expect(directUpload(file('a.txt'), { fetchImpl, putImpl: putOk() })).rejects.toThrow(/未授权/);
  });

  it('sign 响应体不是 JSON 时退化为通用中文错误而不是崩在 json 解析上', async () => {
    const fetchImpl = asFetch(async () => ({
      ok: false, status: 500, json: async () => { throw new Error('Unexpected token <'); },
    }));
    await expect(directUpload(file('a.txt'), { fetchImpl, putImpl: putOk() }))
      .rejects.toThrow(/获取上传地址失败/);
  });

  it('sign 200 但缺 key 时同样算失败（不能拿着半个响应去 PUT）', async () => {
    const putImpl = putOk();
    await expect(directUpload(file('a.txt'), { fetchImpl: signOk({ key: undefined }), putImpl }))
      .rejects.toThrow(/获取上传地址失败/);
    expect(putImpl).not.toHaveBeenCalled();
  });

  it('PUT 返回非 2xx 时抛错以便入队重试', async () => {
    const putImpl = vi.fn(async (): Promise<PutResult> => ({ ok: false, status: 403 }));
    await expect(directUpload(file('a.txt'), { fetchImpl: signOk(), putImpl })).rejects.toThrow(/403/);
  });

  it('离线时 fetch 抛错原样冒泡给队列', async () => {
    const fetchImpl = asFetch(async () => { throw new TypeError('Failed to fetch'); });
    await expect(directUpload(file('a.txt'), { fetchImpl, putImpl: putOk() })).rejects.toThrow(/Failed to fetch/);
  });

  it('PUT 阶段离线也原样冒泡（队列据此判 network 并退避）', async () => {
    const putImpl = vi.fn(async (): Promise<PutResult> => { throw new TypeError('Failed to fetch'); });
    await expect(directUpload(file('a.txt'), { fetchImpl: signOk(), putImpl })).rejects.toThrow(/Failed to fetch/);
  });
});
