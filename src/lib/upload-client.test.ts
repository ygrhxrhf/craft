import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const directUpload = vi.fn(async (f: File) => ({
  url: `/api/files/${f.name}`, name: f.name, size: f.size, type: f.type,
}));
vi.mock('./attachment-client', () => ({ directUpload: (...a: unknown[]) => directUpload(...(a as [File])) }));

import { uploadFile, formatFileSize } from './upload-client';

const file = () => new File([Buffer.from('hello', 'utf8')], 'a.txt', { type: 'text/plain' });

let fetchMock: ReturnType<typeof vi.fn>;

// 本仓库 vitest 跑在 node 环境（vitest.config.ts 未设 jsdom，且不允许新增依赖），
// 所以自己造一个 window 壳来模拟首屏注入的开关。
function setFlag(v: boolean | undefined) {
  vi.stubGlobal('window', v === undefined ? {} : { __STORAGE_CONFIG__: { directUpload: v } });
}

beforeEach(() => {
  vi.clearAllMocks();
  setFlag(undefined);
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ url: '/api/files/legacy.txt', name: 'legacy.txt', size: 5 }) }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('uploadFile', () => {
  it('开关未下发时走旧 multipart 通道（local 驱动默认路径）', async () => {
    const r = await uploadFile(file());
    expect(r).toEqual({ url: '/api/files/legacy.txt', name: 'legacy.txt', size: 5 });
    expect(directUpload).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/files');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('开关显式为 false 时同样走旧通道', async () => {
    setFlag(false);
    await uploadFile(file());
    expect(directUpload).not.toHaveBeenCalled();
  });

  it('开关为 true 时走直传并返回 COS key', async () => {
    setFlag(true);
    const r = await uploadFile(file());
    expect(directUpload).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(r).toEqual({ url: '/api/files/a.txt', name: 'a.txt', size: 5 });
  });

  it('旧通道非 2xx 时抛服务端错误（基线语义不变）', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: '文件不存在' }) });
    await expect(uploadFile(file())).rejects.toThrow('文件不存在');
  });

  it('formatFileSize 三档不变', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
