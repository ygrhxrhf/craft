import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetDriverForTest } from './storage-driver';
import { setUploadDirForTest } from './storage-local';
import { resetCosForTest, setCosClientForTest } from './storage-cos';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { saveUpload, saveUploadBuffer, readUpload, deleteUpload, presignGetOrNull, directUploadEnabled, mimeForName, NAME_RE } from './storage';

let dir: string;
let savedDriver: string | undefined;
const COS_ENV = ['COS_BUCKET', 'COS_REGION', 'COS_SECRET_ID', 'COS_SECRET_KEY'] as const;
let savedCosEnv: Partial<Record<(typeof COS_ENV)[number], string | undefined>> = {};

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'crafty-facade-'));
  setUploadDirForTest(dir);
  savedDriver = process.env.STORAGE_DRIVER;
  delete process.env.STORAGE_DRIVER;
  savedCosEnv = {};
  for (const k of COS_ENV) {
    savedCosEnv[k] = process.env[k];
    process.env[k] = k === 'COS_BUCKET' ? 'crafty-1250000000'
      : k === 'COS_REGION' ? 'ap-guangzhou'
      : k === 'COS_SECRET_ID' ? 'AKIDtest' : 'secretkeytest';
  }
  resetDriverForTest();
  resetCosForTest();
});

afterEach(() => {
  setUploadDirForTest(null);
  resetDriverForTest();
  resetCosForTest();
  if (savedDriver === undefined) delete process.env.STORAGE_DRIVER;
  else process.env.STORAGE_DRIVER = savedDriver;
  for (const k of COS_ENV) {
    if (savedCosEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedCosEnv[k];
  }
});

/** 切到 cos 驱动并注入一个不落盘的假客户端。 */
function useCosClient() {
  process.env.STORAGE_DRIVER = 'cos';
  resetDriverForTest();
  const putObject = vi.fn(async () => ({}));
  const deleteObject = vi.fn(async () => ({}));
  setCosClientForTest({ getAuth: () => 'q-signature=abc', putObject, deleteObject });
  return { putObject, deleteObject };
}

describe('storage 门面', () => {
  it('directUploadEnabled 随驱动翻转，local 驱动下必须为 false', () => {
    // beforeEach 已把 STORAGE_DRIVER 清空 ⇒ 默认 local。
    expect(directUploadEnabled()).toBe(false);
    process.env.STORAGE_DRIVER = 'local';
    resetDriverForTest();
    expect(directUploadEnabled()).toBe(false);
  });

  it('directUploadEnabled 在 cos 驱动下为 true（与 presignGetOrNull 同源）', () => {
    useCosClient();
    expect(directUploadEnabled()).toBe(true);
    expect(presignGetOrNull('a.png')).not.toBeNull();
  });

  it('local 驱动下 saveUpload/readUpload 往返不变', async () => {
    const r = await saveUpload(new File([Buffer.from('hi')], 'a.txt', { type: 'text/plain' }));
    expect((await readUpload(r.name)).toString('utf8')).toBe('hi');
  });

  it('local 驱动下 deleteUpload 幂等', async () => {
    const r = await saveUpload(new File([Buffer.from('hi')], 'a.txt', { type: 'text/plain' }));
    await deleteUpload(r.name);
    await expect(deleteUpload(r.name)).resolves.toBeUndefined();
  });

  it('local 驱动下 presignGetOrNull 返回 null', () => {
    expect(presignGetOrNull('a.png')).toBeNull();
  });

  it('cos 驱动下 saveUpload 走 putObject 而不落本地盘', async () => {
    const { putObject } = useCosClient();
    const r = await saveUpload(new File([Buffer.from('cos-bytes')], 'b.png', { type: 'image/png' }));
    expect(putObject).toHaveBeenCalledTimes(1);
    expect(r.name).toMatch(/\.png$/);
    expect(r.size).toBe(9);
    // 名字说了「不落本地盘」，就必须真的断言盘上为空
    expect(await readdir(dir)).toHaveLength(0);
  });

  it('cos 驱动下 saveUploadBuffer 也走 putObject 且不落本地盘', async () => {
    const { putObject } = useCosClient();
    const r = await saveUploadBuffer(Buffer.from('abc'), '.png');
    expect(putObject).toHaveBeenCalledTimes(1);
    expect(r.name.endsWith('.png')).toBe(true);
    expect(r.size).toBe(3);
    expect(await readdir(dir)).toHaveLength(0);
  });

  it('cos 驱动下 deleteUpload 走 deleteObject', async () => {
    const { deleteObject } = useCosClient();
    await deleteUpload('a.png');
    expect(deleteObject).toHaveBeenCalledTimes(1);
  });

  it('cos 驱动下 deleteUpload 对非法文件名也不抛错（吞错是硬约束）', async () => {
    const { deleteObject } = useCosClient();
    // 关键回归点：safeKey 在 try/catch 之外，历史上 deleteUpload 从不抛。
    await expect(deleteUpload('bad name.png')).resolves.toBeUndefined();
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it('cos 驱动下 presignGetOrNull 返回预签名 URL', () => {
    useCosClient();
    const url = presignGetOrNull('c.png');
    expect(url).not.toBeNull();
    expect(url!.url).toContain('q-signature=');
  });

  it('cos 驱动下 presignGetOrNull 对非法文件名抛错', () => {
    useCosClient();
    expect(() => presignGetOrNull('bad name.png')).toThrow('非法文件名');
  });

  it('cos 驱动下 readUpload 抛错并指向 302 通路', async () => {
    useCosClient();
    await expect(readUpload('a.png')).rejects.toThrow(/presignGetOrNull/);
  });

  it('NAME_RE 与 mimeForName 保持原契约', () => {
    expect(NAME_RE.test('ok_name-1.png')).toBe(true);
    expect(NAME_RE.test('bad name.png')).toBe(false);
    expect(mimeForName('x.MD')).toBe('text/markdown; charset=utf-8');
  });
});
