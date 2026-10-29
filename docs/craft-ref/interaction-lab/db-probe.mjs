/**
 * 本地库面探针（宿主侧，Node/Postgres）。
 *
 * 为什么这一档只能**单侧**采：官方没有可查的库。所以 `db` 不是"两侧对比面"，而是
 * **本地侧的自证面**——用来回答"这个交互在库里留下了什么"。它只进 selfCheck，不进 differ。
 *
 * ★ 为什么值得做：本地文档的 `content` 按红线**不进同步白名单**（`src/lib/sync/tables.ts`
 *   的 `DOC_CONTENT_COLS`），所以"编辑器里看到的"和"库里存的"本来就可能不同。
 *   没有这一档，任何"操作已生效"的说法都只有屏幕这一侧的证据。
 */
import { readFileSync } from 'node:fs';
import pg from 'file:///C:/code/craft/node_modules/pg/lib/index.js';

const ENV = 'C:/code/craft/.env';
let clientPromise = null;

function client() {
  if (!clientPromise) {
    const url = readFileSync(ENV, 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
    const c = new pg.Client({ connectionString: url });
    clientPromise = c.connect().then(() => c);
  }
  return clientPromise;
}

/** 按文档 id 取一行库面快照；`id` 为空时返回 `exists:false` 并说明原因。 */
export async function queryDocDb(id) {
  if (!id) return { exists: false, reason: 'no temp doc id' };
  try {
    const c = await client();
    const r = await c.query(
      'select id, title, "isDeleted", "updatedAt", "parentId", "folderId", length(coalesce(content::text, \'\')) as contentLen from documents where id = $1',
      [id],
    );
    const row = r.rows[0];
    if (!row) return { exists: false, reason: 'row missing' };
    return {
      exists: true,
      isDeleted: row.isDeleted,
      title: row.title ?? '',
      parentId: row.parentId,
      folderId: row.folderId,
      // content 长度：用来证伪/证实"内容是否落库"（当前红线＝不落库 ⇒ 期望 0）
      contentLen: Number(row.contentLen || 0),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    };
  } catch (e) {
    return { exists: false, reason: 'db error: ' + String((e && e.message) || e).slice(0, 120) };
  }
}

export async function closeDb() {
  if (!clientPromise) return;
  try { const c = await clientPromise; await c.end(); } catch { /* ignore */ }
  clientPromise = null;
}
