import { config } from 'dotenv';

// The route writes through the real ORM here on purpose: the claim under test is a
// Postgres transaction rule, and a mocked ORM cannot have that rule.
config();

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const session = vi.hoisted(() => ({ userId: '' }));

/* Only the session is faked. Everything below the route — the transaction, the unique
 * constraint, the abort semantics — has to be the real database. */
vi.mock('@/lib/authz/guard', () => ({
  requireUserId: async () => session.userId,
  AuthorizationError: class extends Error {},
}));

const { getDb } = await import('@/prisma/db');
const { POST } = await import('./route');

let db: Awaited<ReturnType<typeof getDb>>;
let userId = '';
let documentId = '';
let storedFavoriteId = '';

const post = (body: unknown) => new NextRequest('http://x/api/v1/sync', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

const favoriteRows = () => db.orm.public.Favorite.where({ userId }).all();

beforeAll(async () => {
  db = await getDb();
  userId = crypto.randomUUID();
  documentId = crypto.randomUUID();
  await db.orm.public.User.create({
    id: userId,
    email: `sync-25p02-${userId.slice(0, 8)}@example.com`,
    name: '同步时序测试账号',
    // Not a credential: this row never logs in, the session is mocked above.
    password: '!no-login-test-row',
  });
  await db.orm.public.Document.create({ id: documentId, title: 'G1625 先读后写', userId });
  storedFavoriteId = crypto.randomUUID();
  await db.orm.public.Favorite.create({
    id: storedFavoriteId, userId, documentId, order: 0,
    updatedAt: '2020-01-01T00:00:00.000Z',
  });
  session.userId = userId;
});

afterAll(async () => {
  await db.orm.public.Favorite.where({ userId }).delete();
  await db.orm.public.SyncEvent.where({ userId }).delete();
  await db.orm.public.Document.where({ id: documentId }).delete();
  await db.orm.public.User.where({ id: userId }).delete();
});

describe('sync 写路径的唯一键冲突（真库）', () => {
  // 这条不是回归用例而是前提复核：整套「先读后写」的改造都建立在「撞键之后事务已死」上。
  // 若哪天 Postgres 或驱动换了语义（例如自动开 savepoint），这里先红，提醒重审 G1625。
  it('事务内撞唯一键后，任何后续读都抛 25P02（先读后写的理由）', async () => {
    const readings: unknown[] = [];
    await db.transaction(async (tx: any) => {
      let createError: unknown = null;
      try {
        await tx.orm.public.Favorite.create({
          id: crypto.randomUUID(), userId, documentId, order: 1,
        });
      } catch (e) {
        createError = e;
      }
      expect(createError).not.toBeNull();
      expect(String((createError as Error).message)).toMatch(/duplicate key/);
      let readError: unknown = null;
      try {
        readings.push(await tx.orm.public.Favorite.first({ userId, documentId }));
      } catch (e) {
        readError = e;
      }
      expect(readError).not.toBeNull();
      expect(String((readError as Error).message)).toMatch(/current transaction is aborted/);
    });
    expect(readings).toHaveLength(0);
    // 事务回滚：冲突那笔没留下任何东西
    expect(await favoriteRows()).toHaveLength(1);
  });

  // G1625 回归：本机镜像持旧 id 时点「取消固定」= 一笔带新 deletedAt、pk 与库里那行不同的
  // upsert。修前盲 create 撞 (userId, documentId) 唯一键 ⇒ 事务 aborted ⇒ 整批 500 ⇒ 客户端
  // 无限重推同一笔（真机取证 8 次全 500）。修后必须在 create 之前按唯一键回读、就地改墓碑。
  it('陈旧 id 的取消固定：整批 200，就地墓碑存量行，不新增行', async () => {
    const staleId = crypto.randomUUID();
    const syncTs = '2026-11-15T00:00:00.000Z';

    const res = await POST(post({ records: [{
      table: 'favorite', id: staleId, op: 'upsert',
      data: { id: staleId, documentId, deletedAt: syncTs, updatedAt: syncTs },
      syncTs,
    }] }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.applied).toEqual([{ table: 'favorite', id: storedFavoriteId }]);

    const rows = await favoriteRows() as Record<string, any>[];
    expect(rows).toHaveLength(1);                       // 没有铸出第二行
    expect(rows[0]!.id).toBe(storedFavoriteId);         // 存量行主键未动
    expect(new Date(rows[0]!.deletedAt).toISOString()).toBe(syncTs);
    expect(new Date(rows[0]!.updatedAt).toISOString()).toBe(syncTs);
  });
});
