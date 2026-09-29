// src/app/api/v1/events/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  AuthorizationError: class extends Error {},
}));
vi.mock('@/lib/sync/poller', async (importOriginal) => {
  const orig = await importOriginal<any>();
  return { ...orig, getSharedPoller: vi.fn(() => ({ start: vi.fn(), subscribe: (id: string, cb: any) => { (globalThis as any).__cb = cb; return () => {}; } })) };
});

import { GET } from './route';

describe('GET /api/v1/events (SSE)', () => {
  beforeEach(() => vi.clearAllMocks());
  it('401 未登录', async () => {
    const { requireUserId } = await import('@/lib/authz/guard');
    (requireUserId as any).mockRejectedValueOnce(new (await import('@/lib/authz/guard')).AuthorizationError());
    const res = await GET();
    expect(res.status).toBe(401);
  });
  it('200 且 content-type text/event-stream', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
  });
});
