import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  AuthorizationError: class extends Error {},
}));
vi.mock('@/lib/storage-cos', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage-cos')>('@/lib/storage-cos');
  return {
    ...actual,
    presignPut: vi.fn((key: string, type: string) => ({
      url: `https://example.invalid/${key}?sig=1&t=${encodeURIComponent(type)}`,
      key,
      expiresAt: 4102444800,
    })),
  };
});

import { POST, MAX_ATTACHMENT_SIZE } from './route';
import { presignPut } from '@/lib/storage-cos';
import { resetDriverForTest } from '@/lib/storage-driver';

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/v1/attachments/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const ok = (over: Record<string, unknown> = {}) => ({ name: 'photo.png', size: 1024, type: 'image/png', ...over });

let savedDriver: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  // 直传只在 cos 驱动下签发。@/lib/storage 未被 mock ⇒ 走真实 isCos()。
  savedDriver = process.env.STORAGE_DRIVER;
  process.env.STORAGE_DRIVER = 'cos';
  resetDriverForTest();
});

afterEach(() => {
  if (savedDriver === undefined) delete process.env.STORAGE_DRIVER;
  else process.env.STORAGE_DRIVER = savedDriver;
  resetDriverForTest();
});

describe('POST /api/v1/attachments/sign', () => {
  it('合法请求返回 uploadUrl/key/expiresAt', async () => {
    const res = await POST(req(ok()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(body.uploadUrl).toContain('sig=1');
    expect(typeof body.expiresAt).toBe('number');
  });

  it('key 不使用用户传入的文件名（防覆盖）', async () => {
    await POST(req(ok({ name: 'secret.png' })));
    expect(vi.mocked(presignPut).mock.calls[0][0]).not.toBe('secret.png');
  });

  it('超过 100MB 返回 413 且不签发', async () => {
    const res = await POST(req(ok({ size: MAX_ATTACHMENT_SIZE + 1 })));
    expect(res.status).toBe(413);
    expect(vi.mocked(presignPut)).not.toHaveBeenCalled();
  });

  it('恰好 100MB 放行', async () => {
    expect((await POST(req(ok({ size: MAX_ATTACHMENT_SIZE })))).status).toBe(200);
  });

  it('白名单外的扩展名返回 400', async () => {
    expect((await POST(req(ok({ name: 'x.exe' })))).status).toBe(400);
  });

  it('多点扩展名仍以最后一段判定白名单', async () => {
    expect((await POST(req(ok({ name: 'a.b.png' })))).status).toBe(200);
    expect((await POST(req(ok({ name: 'a.b.exe' })))).status).toBe(400);
  });

  it('type 与扩展名不匹配返回 400（spec 5.2「文件名或类型不在白名单」）', async () => {
    expect((await POST(req(ok({ type: 'text/html' })))).status).toBe(400);
    expect((await POST(req(ok({ type: 'image/gif' })))).status).toBe(400);
  });

  it('名字含路径分隔符时 key 仍只有 UUID+扩展名', async () => {
    const res = await POST(req(ok({ name: '../../secret.png' })));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(body.key).not.toContain('/');
  });

  it('无扩展名的文件名返回 400', async () => {
    expect((await POST(req(ok({ name: 'noext' })))).status).toBe(400);
  });

  it('缺 name/size/type 任一字段返回 400', async () => {
    for (const missing of ['name', 'size', 'type']) {
      const body = ok() as Record<string, unknown>;
      delete body[missing];
      expect((await POST(req(body))).status).toBe(400);
    }
  });

  it('size 为负数、非整数或 0 返回 400', async () => {
    for (const bad of [-1, 1.5, 0]) {
      expect((await POST(req(ok({ size: bad })))).status).toBe(400);
    }
  });

  it('local 驱动下返回 409 且不签发（客户端据此回退旧通道）', async () => {
    process.env.STORAGE_DRIVER = 'local';
    resetDriverForTest();
    const res = await POST(req(ok()));
    expect(res.status).toBe(409);
    expect(vi.mocked(presignPut)).not.toHaveBeenCalled();
  });

  it('未授权返回 401', async () => {
    const { requireUserId, AuthorizationError } = await import('@/lib/authz/guard');
    vi.mocked(requireUserId).mockRejectedValueOnce(new AuthorizationError('未授权'));
    const res = await POST(req(ok()));
    expect([401, 403]).toContain(res.status);
  });
});
