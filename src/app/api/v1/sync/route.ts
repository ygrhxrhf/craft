import { NextRequest } from 'next/server';
import { and, or } from '@prisma/orm-postgres/orm-client';
import { AuthorizationError, requireUserId } from '@/lib/authz/guard';
import { getDb } from '@/prisma/db';
import { SYNC_TABLES } from '@/lib/sync/tables';
import { parseCursor, formatCursor, cmpCursor, type Cursor } from '@/lib/sync/cursor';

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
