import { formatCursor, type Cursor } from './cursor';
import { SYNC_TABLES } from './tables';

/**
 * `gap.md` G1643 —— 硬删表的**墓碑事件**。
 *
 * 同步表里有两张没有 `deletedAt`：`document_member`（移除成员＝真删）与 `notification`
 * （删通知＝真删）。删行之后增量流里不会留下任何痕迹——GET 只能按"现存行"下发，别的设备
 * 于是**永远**停留在旧状态，唯一的兜底是 30 天全量对账（spec 6.4）。对被撤销授权的人来说，
 * 这条延迟不是"界面不准"：他那边还能点开文档、看到成员名册，而服务端早就拒了他。
 *
 * 修法＝把"某行在某时刻被删"记成一条**给某一受众**的事件（`sync_tombstones`），GET 在增量流里
 * 把它当 `op: 'delete'` 下发。受众按语义分两档：
 *  - 成员行：**被移除的人**（他的镜像里那一行必须消失）＋**文档所有者**（他的名册要少一行）；
 *  - 通知行：只有**通知的收件人**。
 *
 * 这条事件不是权威数据：客户端拿到就按删除处理，丢了也无害（30 天全量对账仍是兜底）。
 */
export interface TombstoneInput {
  table: string;
  recordId: string;
  /** 受众 userId 列表（去重后每个受众一行）。 */
  audience: readonly string[];
  syncTs?: string;
}

/** 没有 `deletedAt`、删除即真删的同步表。新增一张这样的表必须同时回答"删给谁看"。 */
const DELETE_LESS_TABLES = SYNC_TABLES
  .filter((def) => !def.cols.includes('deletedAt') && !def.cols.includes('isDeleted'))
  .map((def) => def.table)
  // 这两张没有任何删行通路（账号不可删、每日笔记配置只读写本人行）⇒ 没有墓碑可记。
  .filter((table) => table !== 'user' && table !== 'daily_notes_config');

export const HARD_DELETE_TABLES: readonly string[] = DELETE_LESS_TABLES;

export function isHardDeleteTable(table: string): boolean {
  return (HARD_DELETE_TABLES as readonly string[]).includes(table);
}

/**
 * 墓碑行的形状（与契约 `sync_tombstones` 逐列对应）。`id` 在这里算：唯一键是
 * `(table, recordId, userId)`，用确定性 id 让"同一行的重复删除"天然幂等。
 */
export interface TombstoneRow {
  id: string;
  table: string;
  recordId: string;
  userId: string;
  syncTs: string;
}

/** 确定性 id（同一受众重复记墓碑不叠份；`ON CONFLICT` 之外的第二道保险）。 */
export function tombstoneId(table: string, recordId: string, userId: string): string {
  return `${table}::${recordId}::${userId}`;
}

/** 把一次删除展开成待写的墓碑行（受众去重、空 id 丢弃）。 */
export function tombstoneRows(input: TombstoneInput, syncTs: string): TombstoneRow[] {
  const at = input.syncTs ?? syncTs;
  const seen = new Set<string>();
  const rows: TombstoneRow[] = [];
  for (const userId of input.audience) {
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    rows.push({
      id: tombstoneId(input.table, input.recordId, userId),
      table: input.table,
      recordId: input.recordId,
      userId,
      syncTs: at,
    });
  }
  return rows;
}

/** GET 侧：把墓碑行翻成增量流的一条 `op: 'delete'` 记录。 */
export interface TombstoneCursorRecord {
  table: string;
  id: string;
  op: 'delete';
  syncTs: string;
}

export function tombstoneToRecord(row: {
  table: string;
  recordId: string;
  syncTs: string;
}): TombstoneCursorRecord {
  const at = new Date(row.syncTs).toISOString();
  return { table: row.table, id: row.recordId, op: 'delete', syncTs: at };
}

/** 墓碑行的游标（与普通行同一口径：`(syncTs, id)`，id 取被删行的 recordId）。 */
export function tombstoneCursorId(row: { recordId: string }): string {
  return row.recordId;
}

export function formatTombstoneCursor(ts: string, recordId: string): string {
  const cursor: Cursor = { ts, id: recordId };
  return formatCursor(cursor);
}

/**
 * 删除一枚硬删行时，这枚墓碑要送给谁。
 *  - `document_member`：**文档所有者**。读者的直觉会是"也送给被移除的人"，但 GET 侧成员行是
 *    `where documentId ∈ 本人文档`——协作者自己的镜像里从来没有别人文档的成员行，发给他只是
 *    噪声，而且会把"这个文档 id 存在"这条事实泄露给刚被撤权的人；
 *  - `notification`：**收件人**（通知行按 `where userId` 拉）。
 * 其余表返回空数组（它们要么走 deletedAt 墓碑，要么不在同步渠道里）。
 */
export function audienceForHardDelete(
  table: string,
  row: Record<string, unknown>,
  documentOwnerId?: string | null,
): string[] {
  const owner = typeof documentOwnerId === 'string' ? documentOwnerId : '';
  if (table === 'document_member') {
    return owner ? [owner] : [];
  }
  if (table === 'notification') {
    const recipient = typeof row.userId === 'string' ? row.userId : '';
    return recipient ? [recipient] : [];
  }
  return [];
}
