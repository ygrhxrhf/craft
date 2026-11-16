import { tombstoneRows, type TombstoneInput } from './tombstones';

/**
 * `gap.md` G1643 —— 写墓碑事件。硬删（真 `delete()`）之后调用，把"这一行没了"记成事件
 * 发给该看的人；确定性命（`table::recordId::userId`）让重复删除天然幂等。
 *
 * ☆ 调用点都在**写完行之后**、同一事务/连接里：事件与删除同生共死，不会出现"行没了、
 *   事件也没了"的静默丢失。
 */
export async function writeTombstones(
  db: any,
  input: TombstoneInput,
  syncTs: string = new Date().toISOString(),
): Promise<void> {
  for (const row of tombstoneRows(input, syncTs)) {
    const existing = await db.orm.public.SyncTombstone.first({ id: row.id });
    if (existing) {
      await db.orm.public.SyncTombstone.where({ id: row.id }).update({ syncTs: row.syncTs });
    } else {
      await db.orm.public.SyncTombstone.create(row);
    }
  }
}
