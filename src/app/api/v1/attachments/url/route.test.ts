import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  AuthorizationError: class extends Error {},
}));
vi.mock('@/lib/storage-cos', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage-cos')>('@/lib/storage-cos');
  return {
    ...actual,
    presignGet: vi.fn((key: string) => ({ url: `https://example.invalid/${key}?g=1`, expiresAt: 4102444800 })),
  };
});

import { GET } from './route';
import { presignGet } from '@/lib/storage-cos';


const get = (query: string) => new NextRequest(`http://localhost/api/v1/attachments/url?${query}`);

describe('GET /api/v1/attachments/url', () => {
  it('返回 url 与 expiresAt', async () => {
    const res = await GET(get('key=a.png'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain('g=1');
    expect(typeof body.expiresAt).toBe('number');
    // 签发的是「请求里那个 key」，不是别的
    expect(vi.mocked(presignGet)).toHaveBeenCalledWith('a.png');
  });

  it('缺 key 返回 400', async () => {
    expect((await GET(get(''))).status).toBe(400);
  });

  it('key 含路径分隔符或非法字符返回 400', async () => {
    expect((await GET(get(`key=${encodeURIComponent('../etc/passwd')}`))).status).toBe(400);
    expect((await GET(get(`key=${encodeURIComponent('a/b.png')}`))).status).toBe(400);
  });

  it('key 无扩展名返回 400', async () => {
    expect((await GET(get('key=noext'))).status).toBe(400);
  });

  it('白名单外的扩展名返回 400', async () => {
    expect((await GET(get('key=a.exe'))).status).toBe(400);
  });

  it('未授权返回 401', async () => {
    const { requireUserId, AuthorizationError } = await import('@/lib/authz/guard');
    vi.mocked(requireUserId).mockRejectedValueOnce(new AuthorizationError('未授权'));
    const res = await GET(get('key=a.png'));
    expect([401, 403]).toContain(res.status);
  });
});
