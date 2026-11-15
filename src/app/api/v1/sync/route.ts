import { NextRequest } from 'next/server';
import { and, or } from '@prisma/orm-postgres/orm-client';
import { z } from 'zod';
import { AuthorizationError, requireUserId } from '@/lib/authz/guard';
import { roleSatisfies, type AccessLevel, type ResourceRole } from '@/lib/authz/resource';
import { getDb } from '@/prisma/db';
import { SYNC_TABLES } from '@/lib/sync/tables';
import { UNIQUE_KEY_LOCATORS } from '@/lib/sync/unique-keys';
import { parseCursor, formatCursor, cmpCursor, type Cursor } from '@/lib/sync/cursor';
import { decideLww } from '@/lib/sync/lww';
import { deleteOpExemptsStale, serverTimestamp } from '@/lib/sync-core/stale-arbiter';
import { invalidPayloadColumns } from '@/lib/sync/payload-shape';
import { purgePlan } from '@/lib/sync/purge-plan';
import { emitSyncEvent } from '@/lib/sync/emit-event';
import { materializeTaskReminders } from '@/lib/notification/materialize';
import { materializeDailyDigest } from '@/lib/notification/daily-digest';

export const dynamic = 'force-dynamic';

// R-1 归属作用域：SYNC_TABLES 中没有 userId 列的表，经其归属关系收窄到当前用户——
// document_tag / comment_thread / document_share / document_member → documentId 属于本人文档；
// collection_item / collection_property / collection_view → collectionId 属于本人集合；
// collection_value → itemId 属于本人集合的条目（CollectionItem → Collection 两跳）。
// 下列 id 集在主循环里惰性收集（SYNC_TABLES 顺序保证：document/collection/collection_item
// 均先于依赖它们的表被遍历），且取原始行（不过 since 过滤）以保证续传时集合完整。
const DOC_SCOPED_TABLES = new Set(['document_tag', 'comment_thread', 'document_share', 'document_member']);
const COLLECTION_SCOPED_TABLES = new Set([
  'collection_item', 'collection_property', 'collection_view',
]);
// G1628：写侧要比 GET 侧多一张——`collection_value` 没有 collectionId 列（两跳 itemId →
// CollectionItem.collectionId），GET 侧单独按 itemIds 收窄，POST 侧此前一次都没校验。
const COLLECTION_WRITE_TABLES = new Set([...COLLECTION_SCOPED_TABLES, 'collection_value']);

// G1523 写侧文档作用域鉴权：GET 侧一直按"本人文档"收窄（上面那一段），而 POST 侧此前
// **一次都没校验**——document_tag/comment_thread/document_share/document_member 都不在
// USER_ID_TABLES 里（它们没有 userId 列），where 只剩 `{id}`／`{documentId,tagId}` ⇒
// 任何登录用户 POST 一枚 `document_member{documentId: 别人的文档, userId: 自己, role: editor}`
// 就能把自己加成那篇文档的编辑（IDOR 提权）。这里的档位逐表对齐各自 action 里的要求：
// attachTag/detachTag=editor、createThread=commenter、分享档位与成员增删=owner。
const DOC_WRITE_LEVEL: Record<string, AccessLevel> = {
  document_tag: 'editor',
  comment_thread: 'commenter',
  document_share: 'owner',
  document_member: 'owner',
};

const MEMBER_ROLES: ResourceRole[] = ['editor', 'commenter', 'viewer'];

/**
 * G1628：集合四表的写侧作用域。解析"这一笔实际会落到哪个集合"——返回 `{id}`＝定位到了，
 * `'mismatch'`＝内联归属与存量行不符，`null`＝定位不到。
 *
 * ☆ 为什么内联与存量行都要看：只信内联就漏掉"拿别人的行 id、配自己的 documentId／collectionId"
 * 那一类——鉴权在自己的归属上通过，紧接着 `model.first(where)` 按 id 命中的却是别人的行，
 * update 就落到别人的数据上。两处不一致时没有第三种正确解释，一律拒。
 */
async function resolveCollectionScope(
  scope: any,
  table: string,
  key: Record<string, unknown>,
  current: any,
): Promise<{ id: string } | 'mismatch' | null> {
  const stored = current ?? null;
  if (table === 'collection_value') {
    // 两跳：value.itemId → CollectionItem.collectionId → Collection.userId
    const inlineItem = typeof key.itemId === 'string' ? key.itemId : '';
    const storedItem = typeof stored?.itemId === 'string' ? stored.itemId : '';
    if (inlineItem && storedItem && inlineItem !== storedItem) return 'mismatch';
    const itemId = storedItem || inlineItem;
    if (!itemId) return null;
    const item = await scope.orm.public.CollectionItem.first({ id: itemId });
    const collectionId = typeof item?.collectionId === 'string' ? item.collectionId : '';
    return collectionId ? { id: collectionId } : null;
  }
  const inline = typeof key.collectionId === 'string' ? key.collectionId : '';
  const storedCollection = typeof stored?.collectionId === 'string' ? stored.collectionId : '';
  if (inline && storedCollection && inline !== storedCollection) return 'mismatch';
  const id = storedCollection || inline;
  return id ? { id } : null;
}

/** 集合归属：本人所有、且未进回收站。 */
async function ownsCollection(scope: any, collectionId: string, userId: string): Promise<boolean> {
  const collection = await scope.orm.public.Collection.first({ id: collectionId });
  return Boolean(collection) && !collection.deletedAt && collection.userId === userId;
}

/** 在**同一事务作用域**内解析调用者对该文档的角色并比档（不另开连接，避免读到事务外的旧值）。 */
async function hasDocumentScope(
  scope: any,
  table: string,
  documentId: string,
  userId: string,
): Promise<boolean> {
  const need = DOC_WRITE_LEVEL[table];
  if (!need || !documentId) return false;
  const doc = await scope.orm.public.Document.first({ id: documentId });
  if (!doc || doc.isDeleted) return false;
  if (doc.userId === userId) return roleSatisfies('owner', need); // 所有者：满足任何档
  const member = await scope.orm.public.DocumentMember.first({ documentId, userId });
  const role = member?.role as ResourceRole | undefined;
  if (!role || !MEMBER_ROLES.includes(role)) return false;
  return roleSatisfies(role, need);
}

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    return Response.json({ error: 'unauthorized' }, {
      status: e instanceof AuthorizationError ? 401 : 500,
    });
  }

  const sp = req.nextUrl.searchParams;
  const limitRaw = sp.get('limit');
  const limit = limitRaw === null ? 500 : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    return Response.json({ error: 'bad limit' }, { status: 400 });
  }
  const sinceRaw = sp.get('since');
  let since: Cursor | null = null;
  if (sinceRaw !== null) {
    since = parseCursor(sinceRaw);
    if (!since) return Response.json({ error: 'bad since' }, { status: 400 });
  }

  const db = await getDb();

  // G02：到期的提醒在这一次轮询的**头部**落成 notification 行——放在收集循环之前，
  // 新行（updatedAt=now）才能过得了同一轮的 since 过滤、随这批增量一起出库。
  // 投递是轮询的副作用，不能反过来把整条元数据通路带崩 ⇒ 失败只记日志，下轮重试
  // （(taskId, remindAt) 唯一键保证重试不叠份）。
  try {
    await materializeTaskReminders(userId);
  } catch (e) {
    console.error('[sync] reminder delivery failed', e);
  }

  // G03：每日摘要走同一条轮询副作用；邮件通道仍未实现（G1488），这里只落站内行。
  try {
    await materializeDailyDigest(userId);
  } catch (e) {
    console.error('[sync] daily digest delivery failed', e);
  }

  const collected: { table: string; id: string; op: 'upsert' | 'delete'; data?: any; syncTs: string }[] = [];

  let docIds: string[] = [];
  let collectionIds: string[] = [];
  let itemIds: string[] = [];

  for (const def of SYNC_TABLES) {
    // 逐表取当前用户可见的行（R-1 作用域），再在 JS 侧按 since 续传谓词过滤，归并后统一排序
    let rows: any[] = [];
    if (def.table === 'user') {
      rows = await db.orm.public[def.model].where({ id: userId }).all();
    } else if (DOC_SCOPED_TABLES.has(def.table)) {
      if (docIds.length > 0) {
        rows = await db.orm.public[def.model].where((r: any) => r.documentId.in(docIds)).all();
      }
    } else if (def.table === 'collection_value') {
      if (itemIds.length > 0) {
        rows = await db.orm.public[def.model].where((r: any) => r.itemId.in(itemIds)).all();
      }
    } else if (COLLECTION_SCOPED_TABLES.has(def.table)) {
      if (collectionIds.length > 0) {
        rows = await db.orm.public[def.model].where((r: any) => r.collectionId.in(collectionIds)).all();
      }
    } else {
      // document/folder/tag/favorite/task/daily_notes_config/collection/comment/notification/whiteboard 均有 userId 列
      rows = await db.orm.public[def.model].where({ userId }).all();
    }

    // id 集来自原始行（先于 since 过滤收集：条目行可能不新、其值行新，续传不能漏）
    if (def.table === 'document') docIds = rows.map((r: any) => String(r.id));
    if (def.table === 'collection') collectionIds = rows.map((r: any) => String(r.id));
    if (def.table === 'collection_item') itemIds = rows.map((r: any) => String(r.id));

    for (const r of rows) {
      const syncTsRaw = r[def.tsCol];
      if (!syncTsRaw) continue;
      const syncTs = new Date(syncTsRaw).toISOString();
      const id = def.id(r);
      if (since && (syncTs < since.ts || (syncTs === since.ts && id <= since.id))) continue;
      if (r.deletedAt) {
        collected.push({ table: def.table, id, op: 'delete', syncTs });
      } else {
        // payload 走 def.cols 白名单（禁 SELECT *），content/plainText/wordCount/charCount/version 永不入 data
        const data: Record<string, unknown> = {};
        for (const c of def.cols) if (c in r) data[c] = r[c];
        collected.push({ table: def.table, id, op: 'upsert', data, syncTs });
      }
    }
  }

  collected.sort((a, b) =>
    cmpCursor({ ts: a.syncTs, id: a.id }, { ts: b.syncTs, id: b.id }));
  const page = collected.slice(0, limit);
  const hasMore = collected.length > limit;
  const cursor = page.length
    ? { ts: page[page.length - 1].syncTs, id: page[page.length - 1].id }
    : (since ?? { ts: '1970-01-01T00:00:00.000Z', id: '' });

  await purgeTombstones(db);

  return Response.json(
    { records: page, cursor: formatCursor(cursor), hasMore },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

const recordSchema = z.object({
  table: z.string().min(1),
  id: z.string().min(1),
  op: z.enum(['upsert', 'delete']),
  data: z.record(z.string(), z.unknown()).optional(),
  syncTs: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
});
// R-10/M-3：document_tag 的复合键两列只存在于 data（zod 不保留顶层未知键），
// 缺失会让 delete 的 where 退化成 {documentId: undefined}，故在批级强制必填非空字符串。
const bodySchema = z.object({
  records: z.array(recordSchema).min(1).max(200).superRefine((recs, ctx) => {
    recs.forEach((rec, i) => {
      if (rec.table !== 'document_tag') return;
      for (const f of ['documentId', 'tagId'] as const) {
        const v = rec.data?.[f];
        if (typeof v !== 'string' || v.length === 0) {
          ctx.addIssue({
            code: 'custom', path: [i, 'data', f],
            message: `document_tag requires non-empty data.${f}`,
          });
        }
      }
    });
  }),
});

type PostRecord = z.infer<typeof recordSchema>;
type BatchResult = {
  applied: { table: string; id: string }[];
  rejected: {
    table: string; id: string; op: string; data: unknown; syncTs: string;
    reason?: 'stale' | 'not_found' | 'invalid';
  }[];
  cursor: string;
};

// I1(c)：带 userId 列的表（与 GET 侧 else 分支同源）——写侧 where 强制会话 userId 收窄，
// payload 的 userId 无条件覆盖为会话用户（不取客户端值，防跨用户改写/转移行）。
const USER_ID_TABLES = new Set([
  'document', 'folder', 'tag', 'favorite', 'task',
  'daily_notes_config', 'collection', 'comment', 'notification', 'block_reminder',
  'team_member', 'space_member', 'whiteboard',
]);

// R-19：唯一键定位器（G1627 起落在 `src/lib/sync/unique-keys.ts`，`columns` 与契约唯一约束
// 逐列对应，由 `unique-keys.test.ts` 现读契约核对）。此处只引用，避免"名单在服务端文件里、
// 闸在别处读不到"。

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    return Response.json({ error: 'unauthorized' }, {
      status: e instanceof AuthorizationError ? 401 : 500,
    });
  }

  // 先整体读文本：>2MB 直接 413（不解析），随后从同一份文本解析 JSON
  const text = await req.text();
  if (text.length > 2 * 1024 * 1024) {
    return Response.json({ error: 'payload too large' }, { status: 413 });
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return Response.json({ error: 'bad records' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: 'bad records' }, { status: 400 });
  // 未知表在开事务前整批 400，避免半途作废的事务
  for (const rec of parsed.data.records) {
    if (!SYNC_TABLES.some(d => d.table === rec.table)) {
      return Response.json({ error: `unknown table ${rec.table}` }, { status: 400 });
    }
    // I1(b)：user 表只允许写本人行——记录 id 与会话用户不符 → 400 整批拒绝
    if (rec.table === 'user' && rec.id !== userId) {
      return Response.json({ error: 'user id mismatch' }, { status: 400 });
    }
  }

  const db = await getDb();
  try {
    const result = await applyBatch(db, userId, parsed.data.records);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    // 事务内任一异常 → 整批 500、无部分确认（客户端整批重推，LWW 幂等安全）。
    // 响应体仍是通用句（不外泄内部细节），但必须留栈：静默 500 让整条写路径无从诊断。
    console.error('[sync] batch failed', e);
    return Response.json({ error: 'sync failed' }, { status: 500 });
  }
}

// 事务原子性（spec C6）：本项目 Postgres façade 支持 db.transaction（见
// .agents/skills/prisma-8/references/queries.md:13/216 与 queries-postgres.md:342-361，
// 以及 node_modules/@prisma/orm-postgres/dist/*.d.mts 中 transaction 的声明）。
// 批量写 + 同事务广播（emitSyncEvent 走 tx.orm）包进单事务，异常整体回滚；
// 若运行面没有 transaction（如测试替身），退化为直跑——异常仍以 500 收口、无部分确认。
async function applyBatch(db: any, userId: string, records: PostRecord[]): Promise<BatchResult> {
  const run = async (scope: any): Promise<BatchResult> => {
    const applied: { table: string; id: string }[] = [];
    const rejected: any[] = [];
    const touchedTables = new Set<string>();
    let maxCursor: Cursor = { ts: '1970-01-01T00:00:00.000Z', id: '' };
    // spec C3 的原始前提是"服务端时钟无条件覆盖"；G1511③ 把它放宽成 `max(serverNow, rec.syncTs)`：
    // 服务端仍不信任客户端钟（不拿更早的时间戳盖掉此刻），但**不把客户端更新的时间戳往回拖**，
    // 否则同设备在去抖窗口里连发的两笔会被先到先落的那笔重打时间戳、把后一笔判旧而吞掉。
    const serverNow = () => new Date().toISOString();

    for (const rec of records) {
      const def = SYNC_TABLES.find(d => d.table === rec.table)!; // 上游已整批校验
      // R-10 I-1：复合键字段在 data（document_tag 的 id 读 r.documentId/r.tagId），
      // 顶层 rec 只有 table/id/op/data/syncTs——pk/rejected id/cursor id 与 where 统一取合并源
      const key: Record<string, unknown> = { ...rec, ...rec.data };
      const pk = def.id(key); // document_tag → `${documentId}__${tagId}`；其余即 rec.id
      const model = scope.orm.public[def.model];
      // I1(b)(c)：user 表 where 强制会话用户 id（上游已拒 id≠会话用户的记录）；
      // 带 userId 列的表 where 追加会话 userId——update/first/delete 定位均被收窄到本人行
      const where: Record<string, unknown> = rec.table === 'document_tag'
        ? { documentId: key.documentId, tagId: key.tagId }
        : rec.table === 'user'
          ? { id: userId }
          : USER_ID_TABLES.has(rec.table)
            ? { id: rec.id, userId }
            : { id: rec.id };
      // G1629：值类型闸。坏值（`{isDeleted:'yes'}`／`{order:'3a'}`／非空列收到 null）绑进
      // Postgres 的参数化会直接报错 ⇒ 整个事务 aborted ⇒ 整批 500 ⇒ 客户端无限重推同一笔
      // （G1625 家族的第四副面孔：前三副分别撞唯一键、缺必填列、撞作用域）。这类笔**永远
      // 不可能成功**，所以单独拒掉、让客户端丢弃它，同批其余照常落地。只判 upsert：delete
      // 的 payload 不参与写入。
      if (rec.op === 'upsert') {
        const badValues = invalidPayloadColumns(rec.table, rec.data);
        if (badValues.length) {
          rejected.push({ table: rec.table, id: pk, op: 'delete', syncTs: rec.syncTs, reason: 'invalid' });
          continue;
        }
      }
      // G1523/G1628：作用域表的写侧鉴权（GET 侧一直按"本人文档／本人的集合"收窄，POST 侧此前
      // 一次都没校验）。先读存量行，再拿「存量行自带的归属」与「这一笔自带的归属」一起判：
      // - 两者不一致 ⇒ 这笔声称写 A、实际按 pk 命中的是 B 的行（拿别人行 id 配自己的归属）
      //   ⇒ 拒，否则 update 会落到别人的数据上；
      // - 都没有 ⇒ delete 是无写入的幂等 no-op，放它走正常流程（current=null 会跳过 update）；
      //   upsert 则是一次"没有归属的铸造"——拒。
      // 这些读只用来判"这一行属于哪篇文档／哪个集合"，不把任何列回给调用者。
      // 越权＝not_found（不泄露"这篇文档存在"，与 G1505/G1506 同档）。
      const current = await model.first(where);
      if (DOC_SCOPED_TABLES.has(rec.table)) {
        const inline = typeof key.documentId === 'string' ? key.documentId : '';
        const stored = typeof current?.documentId === 'string' ? current.documentId : '';
        const docId = stored || inline;
        const mismatched = Boolean(inline && stored && inline !== stored);
        if (mismatched || !docId) {
          if (mismatched || rec.op === 'upsert') {
            rejected.push({ table: rec.table, id: pk, op: 'delete', syncTs: rec.syncTs, reason: 'not_found' });
            continue;
          }
        } else if (!(await hasDocumentScope(scope, rec.table, docId, userId))) {
          rejected.push({ table: rec.table, id: pk, op: 'delete', syncTs: rec.syncTs, reason: 'not_found' });
          continue;
        }
      }
      if (COLLECTION_WRITE_TABLES.has(rec.table)) {
        const owner = await resolveCollectionScope(scope, rec.table, key, current);
        if (owner === 'mismatch') {
          rejected.push({ table: rec.table, id: pk, op: 'delete', syncTs: rec.syncTs, reason: 'not_found' });
          continue;
        }
        if (!owner) {
          if (rec.op === 'upsert') {
            rejected.push({ table: rec.table, id: pk, op: 'delete', syncTs: rec.syncTs, reason: 'not_found' });
            continue;
          }
        } else if (!(await ownsCollection(scope, owner.id, userId))) {
          rejected.push({ table: rec.table, id: pk, op: 'delete', syncTs: rec.syncTs, reason: 'not_found' });
          continue;
        }
      }
      const tSrv = current ? new Date(current[def.tsCol]).toISOString() : null;
      const decision = decideLww(rec.op, rec.syncTs, tSrv);

      // G1511①：墓碑不吃 stale——`delete`-op 的语义是"从此刻起不存在"，不跟内容时间戳比大小。
      // 一台设备在去抖窗口里"改名 → 删除"两笔连发时，若服务端把先到的改名那笔重打成"此刻"，
      // 后一笔删除就会因 `tCli <= tSrv` 被判旧而**删不掉**（动作被自己另一笔吞掉）。
      if (decision === 'reject' && !deleteOpExemptsStale(rec.op, 'stale')) {
        rejected.push({
          table: rec.table, id: pk, op: current?.deletedAt ? 'delete' : 'upsert',
          data: pickCols(def, current), syncTs: tSrv!, reason: 'stale',
        });
        continue;
      }
      // G1511③：落库时间戳取 `max(serverNow, rec.syncTs)`——服务端认这台设备自己给的时间戳，
      // 不把它往回拖。官方那句"同一台设备上刚敲下的那一下与紧接着的第二下不会互相吞"就是这个意思：
      // 先到先落的那笔不该把自己的时间戳抬到"此刻"、从而把同设备后一笔判旧。
      const ts = serverTimestamp(serverNow(), rec.syncTs);
      // 撞唯一键改写存量行时，applied/cursor 报存量行真实 pk（与 GET 侧 def.id 同源）
      let appliedId = pk;
      if (rec.op === 'delete') {
        if (current) {
          // I8/spec 4.5：读侧（树/回收站/搜索）按 isDeleted 过滤——含该列的表
          // delete-op 必须同时写 isDeleted:true，否则行从增量流消失但读侧仍当活行
          // 渲染（复活）。
          // G1521：墓碑列按表配置——`deletedAt` 只有真在 `cols` 里的表才写。此前无条件写，
          // 而 document_member（contract 无 deletedAt）一旦走 delete-op 就会在
          // `update({deletedAt})` 抛 unknown column ⇒ 整批 500。缺该列的表＝硬删（真 delete()），
          // 语义与该表 action 里的 `members.where({id}).delete()` 一致。
          const tombstone: Record<string, unknown> = { [def.tsCol]: ts };
          if (def.cols.includes('deletedAt')) tombstone.deletedAt = ts;
          if (def.cols.includes('isDeleted')) tombstone.isDeleted = true;
          if (def.cols.includes('deletedAt') || def.cols.includes('isDeleted')) {
            await model.where(where).update(tombstone);
          } else {
            await model.where(where).delete();
          }
        } // 本就不存在 → 幂等接受，无写入
        maxCursor = newer(maxCursor, { ts, id: pk });
      } else {
        // I1(a)：payload 与 def.cols 求交——白名单外的键（content/plainText/任意伪造键）直接丢弃；
        // I1(c)：带 userId 列的表无条件盖会话 userId（create 落库必需，update 与 where 同值）
        const payload: Record<string, unknown> = { [def.tsCol]: ts };
        for (const c of def.cols) if (c in (rec.data ?? {})) payload[c] = rec.data![c];
        if (USER_ID_TABLES.has(rec.table)) payload.userId = userId;
        if (current) {
          await model.where(where).update(payload);
        } else {
          // G1505 铸造闸：定位不到行 ≠ 这台设备在离线新建。离线新建（`create-local.ts`）
          // 一定带齐 `createRequires` 的键（哪怕 title 是空串），而"对一枚陈旧行点了动作"
          // 只带被改的那几列——放过去就会带着会话 userId 铸出一枚服务端从未有过的壳行。
          const mintable = (def.createRequires ?? []).every(k => k in payload);
          if (!mintable) {
            // 不 create、也不回传任何列（服务端本来就没有这行）：op=delete 让本机镜像
            // 停止假装它还活着，reason 交给 UI 说清"不存在或不属于你"（G1506）。
            rejected.push({
              table: rec.table, id: pk, op: 'delete', syncTs: ts, reason: 'not_found',
            });
            continue;
          }
          // R-19 与 G1505 第二副面孔都必须**先读后写**：Postgres 里一条语句失败后整个事务
          // 进入 aborted 态（SQLSTATE 25P02），此后任何查询都抛错 ⇒ 批整体 500、客户端无限
          // 重推同一笔＝毒批次（真机取证：本地镜像持有旧 id 时点「取消固定」，8 次全 500，
          // 直到重新拉取把权威 id 带回来才通）。故冲突一律在 create 之前用定位器回读。
          const locator = UNIQUE_KEY_LOCATORS[rec.table]?.where(key, userId) ?? null;
          const existing = locator ? await model.first(locator) : null;
          if (existing) {
            // 同唯一键、不同 pk 的存量行：跑与主路径同一条 decideLww（apply→update / reject→回传现值）
            const exSrv = new Date(existing[def.tsCol]).toISOString();
            if (decideLww(rec.op, rec.syncTs, exSrv) === 'reject') {
              rejected.push({
                table: rec.table, id: pk, op: existing.deletedAt ? 'delete' : 'upsert',
                data: pickCols(def, existing), syncTs: exSrv, reason: 'stale',
              });
              continue;
            }
            // 不动存量行主键（Tag.id 被 document_tag 外键引用）→ payload 的 id 剥掉
            const patch = { ...payload };
            delete patch.id;
            await model.where(locator).update(patch);
            appliedId = def.id(existing);
          } else {
            // 同一枚 id 已在**他人**名下（越权成员推自己那版元数据，带得齐铸造键，闸放得过）：
            // where 带 userId 定位不到、盲 create 会撞主键。只按 id 读一次（不回传任何列），
            // 命中即按 not_found 拒绝，不把整批打成毒批次。
            const foreign = USER_ID_TABLES.has(rec.table)
              ? await model.first({ id: rec.id })
              : null;
            if (foreign) {
              rejected.push({
                table: rec.table, id: pk, op: 'delete', syncTs: ts, reason: 'not_found',
              });
              continue;
            }
            await model.create({ ...payload, id: rec.table === 'document_tag' ? undefined : rec.id });
          }
        }
        maxCursor = newer(maxCursor, { ts, id: appliedId });
      }
      applied.push({ table: rec.table, id: appliedId });
      touchedTables.add(rec.table);
    }

    // 同事务广播：emit 与批量写同生共死（applied 非空才广播）
    if (applied.length) await emitSyncEvent(scope, userId, [...touchedTables], maxCursor);
    return { applied, rejected, cursor: formatCursor(maxCursor) };
  };
  return typeof db.transaction === 'function' ? db.transaction(run) : run(db);
}

function pickCols(def: (typeof SYNC_TABLES)[number], row: any) {
  if (!row) return undefined;
  const out: Record<string, unknown> = {};
  for (const c of def.cols) if (c in row) out[c] = row[c];
  return out;
}
function newer(a: Cursor, b: Cursor): Cursor {
  return cmpCursor(a, b) >= 0 ? a : b;
}

// 懒清理：每次同步轮换一张表，物理删除 30 天前的墓碑，单次至多 100 行。
// 注意本版 ORM 事实（已核对 orm-client 源码）：where 简写只支持 = / IS NULL，
// 比较必须用 lambda 字段代理；limit() 不作用于 delete 终端，所以先 select 主键
// 再按主键集合批量删（deleteAndCount 单查询收口），失败吞掉不阻塞同步。
// G1632：清理清单不再手抄——带 `deletedAt` 的同步表全部进轮转，身份列取契约主键
// （`purge-plan.ts`，`purge-plan.test.ts` 对 `SYNC_TABLES` 与 `contract.json` 两侧核对）。
let purgeRotation = 0;

async function purgeTombstones(db: any) {
  const plan = purgePlan();
  const { model, identity: identityCols } = plan[purgeRotation % plan.length]!;
  purgeRotation++;
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const rows: any[] = await db.orm.public[model]
      .where((r: any) => r.deletedAt.lt(cutoff))
      .select(...identityCols)
      .limit(100)
      .all();
    if (rows.length === 0) return;
    const predicate = identityCols.length === 1
      ? (r: any) => r[identityCols[0]].in(rows.map((row: any) => row[identityCols[0]]))
      : (r: any) => or(...rows.map((row: any) =>
          and(...identityCols.map((c) => r[c].eq(row[c])))));
    await db.orm.public[model].where(predicate).deleteAndCount();
  } catch { /* 懒清理失败不阻塞同步 */ }
}
