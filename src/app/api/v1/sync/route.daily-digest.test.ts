import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/authz/guard', () => ({
  requireUserId: vi.fn(async () => 'u1'),
  AuthorizationError: class extends Error {},
}));
vi.mock('@/lib/notification/materialize', () => ({
  materializeTaskReminders: vi.fn(async () => 0),
}));
vi.mock('@/lib/notification/daily-digest', () => ({
  materializeDailyDigest: vi.fn(async () => 0),
}));

import { getDb } from '@/prisma/db';
import { materializeDailyDigest } from '@/lib/notification/daily-digest';
import { GET } from './route';

function mockDb(byModel: Record<string, any[]>) {
  const chainFor = (rows: any[]) => {
    const chain = {
      where: () => chain,
      orderBy: () => chain,
      select: () => chain,
      limit: () => Promise.resolve(rows),
      all: () => Promise.resolve(rows),
      delete: vi.fn(async () => ({})),
      deleteAndCount: vi.fn(async () => ({ count: 0 })),
    };
    return chain;
  };
  const empty = chainFor([]);
  (getDb as any).mockResolvedValue({
    orm: {
      public: new Proxy({}, {
        get: (_target, model: string) => (
          model === 'SyncEvent' ? { create: vi.fn() }
            : model in byModel ? chainFor(byModel[model]) : empty
        ),
      }),
    },
  });
}

describe('GET /api/v1/sync daily digest wiring', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs the digest at the poll head and ships its row with this response', async () => {
    const notificationRows: any[] = [];
    mockDb({ Notification: notificationRows });
    vi.mocked(materializeDailyDigest).mockImplementationOnce(async () => {
      notificationRows.push({
        id: 'n2', userId: 'u1', kind: 'dailyDigest', taskId: null, documentId: null,
        title: '今天的摘要：1 个任务、0 个提醒', isResolved: false,
        createdAt: '2026-09-28T10:00:04.000Z', updatedAt: '2026-09-28T10:00:04.000Z', deletedAt: null,
      });
      return 1;
    });

    const body = await (await GET(new NextRequest('http://x/api/v1/sync'))).json();
    expect(materializeDailyDigest).toHaveBeenCalledWith('u1');
    const notification = body.records.find((record: any) => record.table === 'notification');
    expect(notification).toMatchObject({
      id: 'n2',
      op: 'upsert',
      data: { kind: 'dailyDigest', title: '今天的摘要：1 个任务、0 个提醒' },
    });
  });

  it('a digest failure does not take down the metadata stream', async () => {
    mockDb({ Document: [{
      id: 'd1', title: 't', content: { big: 'NEVER' }, plainText: 'x',
      isDeleted: false, deletedAt: null,
      updatedAt: '2026-09-28T10:00:00.000Z', metaUpdatedAt: '2026-09-28T10:00:00.000Z',
    }] });
    vi.mocked(materializeDailyDigest).mockRejectedValueOnce(new Error('db down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await GET(new NextRequest('http://x/api/v1/sync'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.records.map((record: any) => record.id)).toContain('d1');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
