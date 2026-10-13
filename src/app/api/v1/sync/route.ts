import { NextRequest } from 'next/server';
import { and, or } from '@prisma/orm-postgres/orm-client';
import { z } from 'zod';
import { AuthorizationError, requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { SYNC_TABLES } from '@/lib/sync/tables';
import { parseCursor, formatCursor, cmpCursor, type Cursor } from '@/lib/sync/cursor';
import { decideLww } from '@/lib/sync/lww';
import { emitSyncEvent } from '@/lib/sync/emit-event';

export const dynamic = 'force-dynamic';

// R-1 归属作用域：SYNC_TABLES 中没有 userId 列的表，经其归属关系收窄到当前用户——
// document_tag / comment_thread / document_share → documentId 属于本人文档；
// collection_item / collection_property / collection_view → collectionId 属于本人集合；
// collection_value → itemId 属于本人集合的条目（CollectionItem → Collection 两跳）。
// 下列 id 集在主循环里惰性收集（SYNC_TABLES 顺序保证：document/collection/collection_item
// 均先于依赖它们的表被遍历），且取原始行（不过 since 过滤）以保证续传时集合完整。
const DOC_SCOPED_TABLES = new Set(['document_tag', 'comment_thread', 'document_share']);
const COLLECTION_SCOPED_TABLES = new Set([
  'collection_item', 'collection_property', 'collection_view',
]);

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
      // document/folder/tag/favorite/task/daily_notes_config/collection/comment/whiteboard 均有 userId 列
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
  rejected: { table: string; id: string; op: string; data: unknown; syncTs: string }[];
  cursor: string;
};

// I1(c)：带 userId 列的表（与 GET 侧 else 分支同源）——写侧 where 强制会话 userId 收窄，
// payload 的 userId 无条件覆盖为会话用户（不取客户端值，防跨用户改写/转移行）。
const USER_ID_TABLES = new Set([
  'document', 'folder', 'tag', 'favorite', 'task',
  'daily_notes_config', 'collection', 'comment', 'whiteboard',
]);

// R-19：唯一键表在「按 pk 定位不到、但唯一键撞上存量（含墓碑）行」时盲 create 会抛
// 唯一约束 → 整批 500 → 客户端无限重推（毒批次）。冲突时按这里的定位器回读现存行，
// 跑与主路径同一条 decideLww（update-or-reject）。
// 作用域强制用批级 userId（R-1），不取 payload 里的 userId，避免越权定位他人行。
const UNIQUE_KEY_LOCATORS: Record<
  string,
  (key: Record<string, unknown>, userId: string) => Record<string, unknown> | null
> = {
  tag: (key, userId) => (key.name == null ? null : { name: key.name, userId }),
  favorite: (key, userId) => (key.documentId == null ? null : { userId, documentId: key.documentId }),
  collection_value: (key) =>
    (key.itemId == null || key.propertyId == null)
      ? null
      : { itemId: key.itemId, propertyId: key.propertyId },
};

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
  } catch {
    // 事务内任一异常 → 整批 500、无部分确认（客户端整批重推，LWW 幂等安全）
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
    const serverNow = () => new Date().toISOString(); // spec C3：服务端时钟无条件覆盖

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
      const current = await model.first(where);
      const tSrv = current ? new Date(current[def.tsCol]).toISOString() : null;
      const decision = decideLww(rec.op, rec.syncTs, tSrv);

      if (decision === 'reject') {
        rejected.push({
          table: rec.table, id: pk, op: current?.deletedAt ? 'delete' : 'upsert',
          data: pickCols(def, current), syncTs: tSrv!,
        });
        continue;
      }
      const ts = serverNow();
      // 撞唯一键改写存量行时，applied/cursor 报存量行真实 pk（与 GET 侧 def.id 同源）
      let appliedId = pk;
      if (rec.op === 'delete') {
        if (current) {
          // I8/spec 4.5：读侧（树/回收站/搜索）按 isDeleted 过滤——含该列的表
          // delete-op 必须同时写 isDeleted:true，否则行从增量流消失但读侧仍当活行
          // 渲染（复活）。不含该列的表（document_tag 等）只写 deletedAt/updatedAt。
          const tombstone: Record<string, unknown> = { deletedAt: ts, [def.tsCol]: ts };
          if (def.cols.includes('isDeleted')) tombstone.isDeleted = true;
          await model.where(where).update(tombstone);
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
          try {
            await model.create({ ...payload, id: rec.table === 'document_tag' ? undefined : rec.id });
          } catch (err) {
            // R-19：唯一键冲突（同唯一键存量行、不同 pk）→ 按定位器回读存量行，
            // 跑与主路径同一条 decideLww（apply→update / reject→回传现值），批保持原子
            const locator = UNIQUE_KEY_LOCATORS[rec.table]?.(key, userId) ?? null;
            const existing = locator ? await model.first(locator) : null;
            if (!existing) throw err; // 无定位器或定位不到 → 非唯一键错误，维持整批 500
            const exSrv = new Date(existing[def.tsCol]).toISOString();
            if (decideLww(rec.op, rec.syncTs, exSrv) === 'reject') {
              rejected.push({
                table: rec.table, id: pk, op: existing.deletedAt ? 'delete' : 'upsert',
                data: pickCols(def, existing), syncTs: exSrv,
              });
              continue;
            }
            // 不动存量行主键（Tag.id 被 document_tag 外键引用）→ payload 的 id 剥掉
            const patch = { ...payload };
            delete patch.id;
            await model.where(locator).update(patch);
            appliedId = def.id(existing);
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
const PURGE_TABLES = ['Document', 'Folder', 'Collection', 'Whiteboard', 'Tag',
  'DocumentTag', 'Favorite', 'Task', 'Comment', 'CommentThread', 'DocumentShare'];
const PURGE_IDENTITY: Record<string, string[]> = {
  Document: ['id'],
  Folder: ['id'],
  Collection: ['id'],
  Whiteboard: ['id'],
  Tag: ['id'],
  DocumentTag: ['documentId', 'tagId'],
  Favorite: ['id'],
  Task: ['id'],
  Comment: ['id'],
  CommentThread: ['id'],
  DocumentShare: ['id'],
};
let purgeRotation = 0;

async function purgeTombstones(db: any) {
  const model = PURGE_TABLES[purgeRotation % PURGE_TABLES.length];
  purgeRotation++;
  try {
    const identityCols = PURGE_IDENTITY[model];
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
