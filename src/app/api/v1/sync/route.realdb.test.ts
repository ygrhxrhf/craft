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
const { POST, GET } = await import('./route');

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

  // G1627 回归：成员行 `(documentId, userId)` 唯一。两台设备并发加同一人 ⇒ 后到那笔 pk 定位
  // 不到、只能靠唯一键回读。修前盲 create 撞约束 ⇒ 25P02 ⇒ 整批 500（毒批次）。这条在真库上
  // 证明定位器确实把这一笔并到存量行——mock 证明不了"不撞约束"这件事。
  it('成员行撞 (documentId,userId)：整批 200，并到存量行改档，不新增行', async () => {
    const inviteeId = crypto.randomUUID();
    await db.orm.public.User.create({
      id: inviteeId,
      email: `sync-member-${inviteeId.slice(0, 8)}@example.com`,
      name: '被授权的成员',
      password: '!no-login-test-row',
    });
    const storedMemberId = crypto.randomUUID();
    await db.orm.public.DocumentMember.create({
      id: storedMemberId, documentId, userId: inviteeId, role: 'viewer', addedBy: userId,
      updatedAt: '2020-01-01T00:00:00.000Z',
    });

    const res = await POST(post({ records: [{
      table: 'document_member', id: crypto.randomUUID(), op: 'upsert',
      data: { documentId, userId: inviteeId, role: 'editor' },
      syncTs: '2026-11-15T00:00:00.000Z',
    }] }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.applied).toEqual([{ table: 'document_member', id: storedMemberId }]);
    const rows = await db.orm.public.DocumentMember.where({ documentId }).all() as Record<string, any>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(storedMemberId);
    expect(rows[0]!.role).toBe('editor');

    await db.orm.public.DocumentMember.where({ documentId }).delete();
    await db.orm.public.User.where({ id: inviteeId }).delete();
  });

  // G1629 前提复核：坏值绑进参数化确实会让语句失败——这就是值类型闸要挡的那条。
  it('坏值直接写库会抛（float8 收到非数字串），与唯一键撞约束同属「事务已死」', async () => {
    let error: unknown = null;
    try {
      await db.orm.public.Favorite.where({ id: storedFavoriteId }).update({ order: 'not-a-number' as any });
    } catch (e) {
      error = e;
    }
    expect(error).not.toBeNull();
  });

  // G1629 回归：这类笔**永远不可能成功**，服务端必须单独拒收（reason=invalid）而不是让整批 500。
  it('坏值单独拒收，同批好值照常落库（整批 200）', async () => {
    const goodId = crypto.randomUUID();
    // 存量行在上一条用例里被更新到 2026-11-15 ⇒ 这一笔要更晚才算"较新"
    const syncTs = '2026-11-16T00:00:00.000Z';
    const res = await POST(post({ records: [
      { table: 'favorite', id: crypto.randomUUID(), op: 'upsert',
        data: { documentId, order: 'not-a-number' },
        syncTs },
      { table: 'favorite', id: goodId, op: 'upsert',
        data: { documentId, order: 0 },
        syncTs },
    ] }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rejected).toHaveLength(1);
    expect(body.rejected[0]).toMatchObject({ table: 'favorite', reason: 'invalid' });
    // 好值那一笔照常落（并入存量行；order 仍是合法数字）
    expect(body.applied).toEqual([{ table: 'favorite', id: storedFavoriteId }]);
    const rows = await favoriteRows() as Record<string, any>[];
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]!.order)).toBe(0);
  });
});

// G1633 回归：`comment` 的归属此前只按写入者 userId 收窄，threadId 属于谁一次都没判。判据
// 要从 threadId 两跳到文档档位（commenter），而这趟两跳在 mock 里只能证明"调了 first"——
// 真库才证得出"别人的线程行在自己的批次里读不到、自己那行照常铸得出"。
describe('评论写侧归属（真库）', () => {
  it('别人文档线程里的评论被拒收；自己文档线程里的照常创建', async () => {
    // 受害者：另一个账号 + 一篇文档 + 一条线程（会话仍是 u1）
    const victimId = crypto.randomUUID();
    const victimDocId = crypto.randomUUID();
    const victimThreadId = crypto.randomUUID();
    await db.orm.public.User.create({
      id: victimId,
      email: `sync-victim-${victimId.slice(0, 8)}@example.com`,
      name: '别人',
      password: '!no-login-test-row',
    });
    await db.orm.public.Document.create({ id: victimDocId, title: '别人的文档', userId: victimId });
    await db.orm.public.CommentThread.create({
      id: victimThreadId, documentId: victimDocId, blockId: null, blockText: '别人写的话',
    });

    const syncTs = '2026-11-17T00:00:00.000Z';
    const forged = await POST(post({ records: [{
      table: 'comment', id: crypto.randomUUID(), op: 'upsert',
      data: { threadId: victimThreadId, userId, body: '我没被邀请' },
      syncTs,
    }] }));
    const forgedBody = await forged.json();
    expect(forged.status).toBe(200);
    expect(forgedBody.applied).toEqual([]);
    expect(forgedBody.rejected[0]).toMatchObject({ table: 'comment', reason: 'not_found' });
    expect(await db.orm.public.Comment.where({ threadId: victimThreadId }).all()).toHaveLength(0);

    // 自己的线程：同一批里的好笔照常落
    const myThreadId = crypto.randomUUID();
    await db.orm.public.CommentThread.create({
      id: myThreadId, documentId, blockId: null, blockText: '我自己的话',
    });
    const own = await POST(post({ records: [{
      table: 'comment', id: crypto.randomUUID(), op: 'upsert',
      data: { threadId: myThreadId, userId, body: '自己线程里说话' },
      syncTs,
    }] }));
    expect((await own.json()).applied).toHaveLength(1);
    expect(await db.orm.public.Comment.where({ threadId: myThreadId }).all()).toHaveLength(1);

    await db.orm.public.Comment.where({ threadId: victimThreadId }).delete();
    await db.orm.public.Comment.where({ threadId: myThreadId }).delete();
    await db.orm.public.CommentThread.where({ id: victimThreadId }).delete();
    await db.orm.public.CommentThread.where({ id: myThreadId }).delete();
    await db.orm.public.Document.where({ id: victimDocId }).delete();
    await db.orm.public.User.where({ id: victimId }).delete();
  });
});

// G1640 回归：表情拆成 per-user 行表后，协作者对**别人的**评论加表情不再需要"替行主改整行"——
// 他自己那一行独立存在，两次并发各加一枚也不会互相覆盖。真库证明的是"行真的落在别人的评论下、
// 且评论行本身一字未动"，mock 只能证明调了 create。
describe('评论表情（per-user 行，真库）', () => {
  it('commenter 对别人的评论加表情：新建本人一行，评论行不动；再取消＝本人那行落墓碑', async () => {
    const authorId = crypto.randomUUID();
    await db.orm.public.User.create({
      id: authorId,
      email: `sync-reaction-${authorId.slice(0, 8)}@example.com`,
      name: '评论作者',
      password: '!no-login-test-row',
    });
    const docId = crypto.randomUUID();
    const threadId = crypto.randomUUID();
    const commentId = crypto.randomUUID();
    await db.orm.public.Document.create({ id: docId, title: '多人共写', userId: authorId });
    await db.orm.public.DocumentMember.create({
      id: crypto.randomUUID(), documentId: docId, userId, role: 'commenter', addedBy: authorId,
    });
    await db.orm.public.CommentThread.create({
      id: threadId, documentId: docId, blockId: null, blockText: '原话',
    });
    await db.orm.public.Comment.create({
      id: commentId, threadId, userId: authorId, body: '作者写的',
    });

    const reactionId = crypto.randomUUID();
    // ☆ 时间戳必须现取，不能写死：服务端对写入取 `max(serverNow, clientTs)`（G1511③），
    //   写死的字面量一旦走到过去，行上留的就是 serverNow，后面那笔更早的取消戳会被判 stale
    //   ⇒ `applied` 空、用例变红。这条曾经就是一颗按日历引爆的哑弹（2026-11-18 当天起必红）。
    const reactTs = new Date(Date.now() - 60_000).toISOString();
    const res = await POST(post({ records: [{
      table: 'comment_reaction', id: reactionId, op: 'upsert',
      data: { commentId, glyph: '👍', name: '会话用户' },
      syncTs: reactTs,
    }] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.applied).toEqual([{ table: 'comment_reaction', id: reactionId }]);

    const rows = await db.orm.public.CommentReaction.where({ commentId }).all() as Record<string, any>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId, glyph: '👍', name: '会话用户' });
    const comment = await db.orm.public.Comment.first({ id: commentId });
    expect(comment!.userId).toBe(authorId);   // 评论署名没被改
    expect(comment!.body).toBe('作者写的');    // 正文一字不动

    // 取消：本人那一行落墓碑（GET 读面按 deletedAt 过滤）
    // 取消那笔必须晚于行上留下的戳（那是第一笔请求落库时的 serverNow）。
    const cancelTs = new Date().toISOString();
    const off = await POST(post({ records: [{
      table: 'comment_reaction', id: reactionId, op: 'upsert',
      data: { commentId, deletedAt: cancelTs },
      syncTs: cancelTs,
    }] }));
    expect((await off.json()).applied).toEqual([{ table: 'comment_reaction', id: reactionId }]);
    const after = await db.orm.public.CommentReaction.first({ id: reactionId });
    expect(after!.deletedAt).not.toBeNull();

    await db.orm.public.CommentReaction.where({ commentId }).delete();
    await db.orm.public.Comment.where({ threadId }).delete();
    await db.orm.public.CommentThread.where({ id: threadId }).delete();
    await db.orm.public.DocumentMember.where({ documentId: docId }).delete();
    await db.orm.public.Document.where({ id: docId }).delete();
    await db.orm.public.User.where({ id: authorId }).delete();
  });
});

// G1637 回归：`metaUpdatedAt` 可空且无 DB 默认，历史行的这一列是 NULL。旧 GET 侧
// `if (!syncTsRaw) continue` 会把整行从增量流里静默跳过（那篇文档永远不上别的设备），
// 而 POST 侧 `new Date(null)` 得到 1970 ⇒ 每一笔客户端写都被判"比服务端新"、LWW 失效。
// 这两条都只有真库造得出"代生成器给了 updatedAt、metaUpdatedAt 留空"的行。
describe('同步时刻列可空的历史行（真库）', () => {
  it('metaUpdatedAt 为 NULL 的文档照样进增量流，syncTs 取 updatedAt', async () => {
    const legacyId = crypto.randomUUID();
    await db.orm.public.Document.create({ id: legacyId, title: '历史行', userId });

    const res = await GET(new NextRequest('http://x/api/v1/sync?limit=1000'));
    const body = await res.json();
    expect(res.status).toBe(200);
    const rec = body.records.find((r: any) => r.table === 'document' && r.id === legacyId);
    expect(rec, 'metaUpdatedAt 为 NULL 的行被跳过了＝那篇文档永远不上别的设备').toBeTruthy();
    expect(rec.op).toBe('upsert');
    expect(rec.syncTs).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(rec.syncTs).not.toContain('1970');

    await db.orm.public.Document.where({ id: legacyId }).delete();
  });

  it('metaUpdatedAt 为 NULL 时 LWW 仍以 updatedAt 为准（更旧的一笔被判 stale）', async () => {
    const legacyId = crypto.randomUUID();
    await db.orm.public.Document.create({
      id: legacyId, title: '历史行', userId, updatedAt: '2026-11-01T00:00:00.000Z',
    });

    const res = await POST(post({ records: [{
      table: 'document', id: legacyId, op: 'upsert',
      data: { title: '旧设备改的' },
      syncTs: '2026-10-01T00:00:00.000Z',      // 比 updatedAt 旧
    }] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.applied, 'NULL 让 tSrv 退化成 1970 ⇒ 旧笔被误判为更新的那笔').toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'document', id: legacyId, reason: 'stale' });
    const row = await db.orm.public.Document.first({ id: legacyId });
    expect(row?.title).toBe('历史行');

    await db.orm.public.Document.where({ id: legacyId }).delete();
  });
});

// G1638 回归：未来戳的界。`rec.syncTs` 由设备自己的钟生成、服务端此前原样采信（G1511③ 的
// `max` 只会抬得更远）：一台时间调到 2099 的设备能把行写成未来时刻 ⇒ 整个账号的增量游标
// （各行时间戳的最大值）被推到未来，之后所有正常时刻的改动都被 since 谓词永久跳过、同一行
// 也被 LWW 永久压死。mock 证明不了"之后那一笔能不能落"，只有真库能。
describe('未来 syncTs 钳制（真库）', () => {
  it('2099 的 syncTs 落库后被钳到此刻，之后正常时刻的写照样落得下去', async () => {
    const docId = crypto.randomUUID();
    const future = '2099-05-01T12:00:00.000Z';
    const before = Date.now();

    const first = await POST(post({ records: [{
      table: 'document', id: docId, op: 'upsert',
      data: { title: '来自未来' }, syncTs: future,
    }] }));
    expect(first.status).toBe(200);

    const stored = await db.orm.public.Document.first({ id: docId });
    const stamp = new Date(stored!.metaUpdatedAt as string).getTime();
    expect(stamp, '2099 被原样落库＝续传游标会被推到未来').toBeLessThanOrEqual(Date.now() + 1_000);
    expect(stamp).toBeGreaterThanOrEqual(before - 1_000);

    // 后续正常时刻的一笔不再被永久判旧
    const second = await POST(post({ records: [{
      table: 'document', id: docId, op: 'upsert',
      data: { title: '后来的正常改动' }, syncTs: new Date().toISOString(),
    }] }));
    expect((await second.json()).applied).toEqual([{ table: 'document', id: docId }]);
    const after = await db.orm.public.Document.first({ id: docId });
    expect(after?.title).toBe('后来的正常改动');

    await db.orm.public.Document.where({ id: docId }).delete();
  });
});

// G1639 回归：外键悬空。Postgres 对每个 N:1 关系都有真外键——一台设备永久删除文档、另一台
// 离线收藏它，重连那笔的 documentId 指向不存在的行：旧实现整批 500（25P02 家族的"悬空引用"
// 面孔），客户端无限重推。mock 证明不了这条，只有真库能。
describe('外键悬空（真库）', () => {
  it('收藏一枚已被删掉的文档：整批 200、该笔按 not_found 拒收，不撞外键', async () => {
    const res = await POST(post({ records: [{
      table: 'favorite', id: crypto.randomUUID(), op: 'upsert',
      data: { documentId: crypto.randomUUID() },
      syncTs: '2026-11-19T00:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.applied).toEqual([]);
    expect(body.rejected[0]).toMatchObject({ table: 'favorite', reason: 'not_found' });
  });

  it('可空的引用列悬空 ⇒ 置 null 后照常落库（文档父页不存在就落到根）', async () => {
    const docId = crypto.randomUUID();
    const res = await POST(post({ records: [{
      table: 'document', id: docId, op: 'upsert',
      data: { title: '父页已删', parentId: crypto.randomUUID() },
      syncTs: '2026-11-19T00:00:00.000Z',
    }] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.applied).toEqual([{ table: 'document', id: docId }]);
    const row = await db.orm.public.Document.first({ id: docId });
    expect(row?.parentId).toBeNull();
    expect(row?.title).toBe('父页已删');
    await db.orm.public.Document.where({ id: docId }).delete();
  });

  it('批内顺序反了（子行先到）也能落：父行被排到前面', async () => {
    const parentId = crypto.randomUUID();
    const childId = crypto.randomUUID();
    const res = await POST(post({ records: [
      { table: 'favorite', id: crypto.randomUUID(), op: 'upsert',
        data: { documentId: parentId }, syncTs: '2026-11-19T00:00:01.000Z' },
      { table: 'document', id: parentId, op: 'upsert',
        data: { title: '父页' }, syncTs: '2026-11-19T00:00:01.000Z' },
    ] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.rejected).toEqual([]);
    expect(body.applied.map((r: any) => r.table).sort()).toEqual(['document', 'favorite']);
    await db.orm.public.Favorite.where({ documentId: parentId }).delete();
    await db.orm.public.Document.where({ id: parentId }).delete();
  });
});

// G1643 回归：硬删表的墓碑事件。`document_member` 没有 deletedAt——旧实现删行之后增量流里
// 什么都不剩，所有者的其他设备会一直显示这位已被移除的协作者。真库证明"删完能拉回一条
// op:delete、且只发给该看的人"：mock 证明不了 GET 侧按受众收窄这件事。
describe('硬删表的墓碑事件（真库）', () => {
  it('移除成员后，所有者拉增量能拿到该成员行的 op:delete；别的账号拿不到', async () => {
    const memberId = crypto.randomUUID();
    const inviteeId = crypto.randomUUID();
    await db.orm.public.User.create({
      id: inviteeId,
      email: `sync-tombstone-${inviteeId.slice(0, 8)}@example.com`,
      name: '被移除的成员',
      password: '!no-login-test-row',
    });
    await db.orm.public.DocumentMember.create({
      id: memberId, documentId, userId: inviteeId, role: 'editor', addedBy: userId,
    });

    // 客户端发 delete op（名册页的「移除」就是这一笔）
    const res = await POST(post({ records: [{
      table: 'document_member', id: memberId, op: 'delete',
      syncTs: '2026-11-21T00:00:00.000Z',
    }] }));
    expect((await res.json()).applied).toEqual([{ table: 'document_member', id: memberId }]);
    expect(await db.orm.public.DocumentMember.where({ id: memberId }).all()).toHaveLength(0);

    // 所有者拉增量：墓碑行必须出现在流里，且是 op:delete
    const pulled = await GET(new NextRequest('http://x/api/v1/sync?limit=1000'));
    const body = await pulled.json();
    const record = body.records.find((r: any) => r.table === 'document_member' && r.id === memberId);
    expect(record, '成员被移除后所有者拉不到墓碑＝名册永远少不掉这一行').toBeTruthy();
    expect(record.op).toBe('delete');

    // 换成另一个账号：同样的一次拉取里不该有这枚墓碑
    session.userId = inviteeId;
    const otherPull = await GET(new NextRequest('http://x/api/v1/sync?limit=1000'));
    const otherBody = await otherPull.json();
    expect(otherBody.records.some((r: any) => r.table === 'document_member' && r.id === memberId)).toBe(false);
    session.userId = userId;

    await db.orm.public.SyncTombstone.where({ recordId: memberId }).delete();
    await db.orm.public.DocumentMember.where({ documentId }).delete();
    await db.orm.public.User.where({ id: inviteeId }).delete();
  });
});

// G1632 回归：清理清单此前手抄 11 张，block_reminder 的墓碑永远不清。清理由 GET 侧轮转执行、
// 失败被 catch 吞掉（"懒清理不阻塞同步"），所以表名/身份列写错时只会静默地什么都不删——
// mock 证明不了这件事，只有真库能。
describe('GET 墓碑轮转清理（真库）', () => {
  it('轮转会轮到 block_reminder：40 天前的墓碑被真删掉', async () => {
    const oldId = crypto.randomUUID();
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString();
    await db.orm.public.BlockReminder.create({
      id: oldId, userId, documentId, blockId: crypto.randomUUID(),
      title: '过期提醒', remindAt: '2026-01-01T00:00:00.000Z',
      isCompleted: false, deletedAt: fortyDaysAgo,
    });

    const { purgePlan } = await import('@/lib/sync/purge-plan');
    // 轮转每 GET 一张表 ⇒ 走满一整圈必然轮到它（多给两圈余量）
    for (let i = 0; i < purgePlan().length * 2; i += 1) {
      await (await import('./route')).GET(new NextRequest('http://x/api/v1/sync?limit=1'));
    }

    const left = await db.orm.public.BlockReminder.where({ id: oldId }).all();
    expect(left, 'block_reminder 的 40 天墓碑还在 ⇒ 清理清单又漏了这张表').toHaveLength(0);
  });
});
