import { getDb } from '@/prisma/db';

export const dynamic = 'force-dynamic';

/**
 * 部署验收清单（`deploy/README.md` §12）里的 `curl /api/health`。
 *
 * 只回答两件事：进程活着、数据库连接可用。不鉴权、不回任何行——Caddy 只需要 200／503
 * 来区分"能接流量"与"依赖没起来"。查询固定一枚不存在的 id，命中与否不影响判据。
 */
export async function GET() {
  try {
    const db = await getDb();
    await db.orm.public.User.first({ id: '__crafty_health__' });
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // 栈留在日志里：静默 503 会让"数据库没起来"和"凭据写错"变成同一句话。
    console.error('[health] database probe failed', error);
    return Response.json(
      { ok: false },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}