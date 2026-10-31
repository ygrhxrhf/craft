import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  AuthorizationError: class extends Error {},
}));
vi.mock('@/lib/sync/poller', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    getSharedPoller: vi.fn(() => ({
      start: vi.fn(),
      subscribe: () => () => {},
    })),
  };
});

import { GET } from './route';

describe('GET /api/v1/notifications/stream (SSE)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('401 without a session', async () => {
    const { requireUserId, AuthorizationError } = await import('@/lib/authz/guard');
    (requireUserId as any).mockRejectedValueOnce(new AuthorizationError());
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('opens an event stream', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
  });
});
