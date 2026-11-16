import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/prisma/db', () => ({ getDb: vi.fn() }));

import { getDb } from '@/prisma/db';
import { GET } from './route';

describe('GET /api/health：部署探活', () => {
  beforeEach(() => vi.clearAllMocks());

  it('数据库可达 → 200 {ok:true}，且禁缓存', async () => {
    const first = vi.fn(async () => null);
    (getDb as any).mockResolvedValue({ orm: { public: { User: { first } } } });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('数据库不可达 → 503 {ok:false}，并留日志', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    (getDb as any).mockRejectedValue(new Error('db down'));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});