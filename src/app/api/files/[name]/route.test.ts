import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

vi.mock('@/lib/auth/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'u1' } })),
}));

import { GET } from './route';
import { setUploadDirForTest } from '@/lib/storage-local';
import { resetDriverForTest } from '@/lib/storage-driver';
import { setCosClientForTest, resetCosForTest } from '@/lib/storage-cos';

const req = (name: string) => new NextRequest(`http://localhost/api/files/${name}`);
const call = (name: string) => GET(req(name), { params: Promise.resolve({ name }) });

let dir: string;
let savedDriver: string | undefined;
let savedCos: Record<string, string | undefined> = {};
const COS_ENV = ['COS_BUCKET', 'COS_REGION', 'COS_SECRET_ID', 'COS_SECRET_KEY'] as const;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'crafty-files-'));
  setUploadDirForTest(dir);
  await writeFile(path.join(dir, 'a.png'), Buffer.from('local-bytes'));
  await writeFile(path.join(dir, 'a.bin'), Buffer.from('bin-bytes'));
  savedDriver = process.env.STORAGE_DRIVER;
  delete process.env.STORAGE_DRIVER;
  savedCos = {};
  for (const k of COS_ENV) {
    savedCos[k] = process.env[k];
    process.env[k] = k === 'COS_BUCKET' ? 'crafty-1250000000'
      : k === 'COS_REGION' ? 'ap-guangzhou'
      : k === 'COS_SECRET_ID' ? 'AKIDtest' : 'secretkeytest';
  }
  resetDriverForTest();
  resetCosForTest();
  setCosClientForTest({
    getAuth: () => 'q-sign-algorithm=sha1&q-signature=abc',
    putObject: vi.fn(async () => ({})),
    deleteObject: vi.fn(async () => ({})),
  });
});

afterEach(() => {
  setUploadDirForTest(null);
  resetDriverForTest();
  resetCosForTest();
  if (savedDriver === undefined) delete process.env.STORAGE_DRIVER;
  else process.env.STORAGE_DRIVER = savedDriver;
  for (const k of COS_ENV) {
    if (savedCos[k] === undefined) delete process.env[k];
    else process.env[k] = savedCos[k];
  }
});

describe('GET /api/files/[name]', () => {
  it('local 驱动仍走本地读并回 200 与真实字节', async () => {
    const res = await call('a.png');
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).toString('utf8')).toBe('local-bytes');
  });

  it('local 驱动下图片 inline、其他 attachment（spec 既有行为不变）', async () => {
    const png = await call('a.png');
    expect(png.headers.get('content-disposition')).toBeNull();
    const bin = await call('a.bin');
    expect(bin.headers.get('content-disposition')).toContain('attachment');
  });

  it('cos 驱动下 302 到预签名 GET，不读本地盘', async () => {
    process.env.STORAGE_DRIVER = 'cos';
    resetDriverForTest();
    const res = await call('a.png');
    expect(res.status).toBe(302);
    const loc = res.headers.get('location');
    expect(loc).toContain('q-signature=');
    expect(loc).toContain('/a.png');
    expect(res.headers.get('cache-control')).toContain('no-store');
    // cos 驱动下不能回本地字节
    expect(await res.text()).toBe('');
  });

  it('cos 驱动下缺文件也走 302（读路径不再依赖服务端探活）', async () => {
    process.env.STORAGE_DRIVER = 'cos';
    resetDriverForTest();
    const res = await call('never-uploaded.png');
    expect(res.status).toBe(302);
  });

  it('local 驱动下缺文件返回 404（既有行为不变）', async () => {
    expect((await call('missing.png')).status).toBe(404);
  });

  it('未授权返回 401 且不签发', async () => {
    const { auth } = await import('@/lib/auth/auth');
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    const res = await call('a.png');
    expect(res.status).toBe(401);
  });
});
