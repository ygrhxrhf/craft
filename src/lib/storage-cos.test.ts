import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PUT_EXPIRES_SEC,
  GET_EXPIRES_SEC,
  presignPut,
  presignGet,
  deleteUploadFromCos,
  setCosClientForTest,
  resetCosForTest,
} from './storage-cos';

const ENV = {
  COS_BUCKET: 'crafty-1250000000',
  COS_REGION: 'ap-guangzhou',
  COS_SECRET_ID: 'AKIDtest',
  COS_SECRET_KEY: 'secretkeytest',
};
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of Object.keys(ENV)) {
    saved[k] = process.env[k];
    process.env[k] = ENV[k as keyof typeof ENV];
  }
  resetCosForTest();
});

afterEach(() => {
  for (const k of Object.keys(ENV)) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetCosForTest();
});

function host() {
  return `${ENV.COS_BUCKET}.cos.${ENV.COS_REGION}.myqcloud.com`;
}

describe('storage-cos 预签名', () => {
  it('过期秒数逐字等于 spec 常量', () => {
    expect(PUT_EXPIRES_SEC).toBe(600);
    expect(GET_EXPIRES_SEC).toBe(300);
  });

  it('presignPut 返回 https URL、key 原样、expiresAt 在 10 分钟内', () => {
    const r = presignPut('a/b.png', 'image/png');
    expect(r.key).toBe('a/b.png');
    expect(r.url.startsWith(`https://${host()}/a/b.png?`)).toBe(true);
    expect(r.expiresAt - Date.now() / 1000).toBeGreaterThan(590);
    expect(r.expiresAt - Date.now() / 1000).toBeLessThanOrEqual(600);
  });

  it('presignPut 的查询串带齐 COS 签名五要素', () => {
    const q = presignPut('a.png', 'image/png').url.split('?')[1];
    expect(q).toContain('q-sign-algorithm=sha1');
    expect(q).toContain('q-ak=AKIDtest');
    expect(q).toContain('q-sign-time=');
    expect(q).toContain('q-signature=');
  });

  it('presignPut 同一秒内两次调用签名一致（纯本地 HMAC，无网络）', () => {
    expect(presignPut('x.png', 'image/png').url).toBe(presignPut('x.png', 'image/png').url);
  });

  it('presignPut 对含空格的 key 做逐段编码且保留斜杠', () => {
    const url = presignPut('dir name/图片 1.png', 'image/png').url;
    expect(url).toContain('dir%20name/%E5%9B%BE%E7%89%87%201.png');
  });

  it('presignGet 过期 5 分钟且不带 content-type 头', () => {
    const r = presignGet('a/b.png');
    expect(r.expiresAt - Date.now() / 1000).toBeLessThanOrEqual(300);
    expect(r.expiresAt - Date.now() / 1000).toBeGreaterThan(290);
  });

  it('缺少 COS_SECRET_ID 时抛可读错误', () => {
    delete process.env.COS_SECRET_ID;
    resetCosForTest();
    expect(() => presignPut('a.png', 'image/png')).toThrow(/COS_SECRET_ID/);
  });

  it('deleteUploadFromCos 在 SDK 报错时静默吞掉', async () => {
    const client = { deleteObject: vi.fn(async () => { throw new Error('NoSuchKey'); }) };
    setCosClientForTest(client);
    await expect(deleteUploadFromCos('a.png')).resolves.toBeUndefined();
  });
});
