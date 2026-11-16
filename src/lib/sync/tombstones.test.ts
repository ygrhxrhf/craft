import { describe, expect, it } from 'vitest';
import {
  HARD_DELETE_TABLES,
  audienceForHardDelete,
  isHardDeleteTable,
  tombstoneId,
  tombstoneRows,
  tombstoneToRecord,
} from './tombstones';
import { SYNC_TABLES } from './tables';

/**
 * `gap.md` G1643 —— 硬删表的**墓碑事件**。同步表里有两张没有 `deletedAt`：
 * `document_member`（移除成员＝真删）与 `notification`（删通知＝真删）。删行之后增量流里不会
 * 留下任何痕迹，别的设备只能等 30 天全量对账——对被撤销授权的人来说，那之前他那边还能点开
 * 文档、看到成员名册。这道闸从 `SYNC_TABLES` 现读"哪些表没有墓碑列"，与 `HARD_DELETE_TABLES`
 * 双向核对：新增一张硬删表而忘了回答"删给谁看"，这里先红。
 */
describe('G1643：硬删表清单与同步表现读一致', () => {
  /** 没有 deletedAt、也没有 isDeleted 的同步表＝删行即真删（通知靠 action 硬删）。 */
  const hardDeleteTables = () => SYNC_TABLES
    .filter((def) => !def.cols.includes('deletedAt') && !def.cols.includes('isDeleted'))
    .map((def) => def.table)
    .filter((table) => table !== 'user' && table !== 'daily_notes_config'); // 这两张没有删行通路

  it('清单 == 现读出来的硬删表（漏一张就有一张表永远不上别的设备）', () => {
    expect([...HARD_DELETE_TABLES].sort()).toEqual(hardDeleteTables().sort());
  });

  it('isHardDeleteTable 只对清单里的表为真', () => {
    for (const table of HARD_DELETE_TABLES) expect(isHardDeleteTable(table)).toBe(true);
    for (const table of ['document', 'comment', 'favorite', 'tag', 'user']) {
      expect(isHardDeleteTable(table), `${table} 不是硬删表`).toBe(false);
    }
  });
});

describe('G1643：墓碑受众', () => {
  it('document_member → 文档所有者（不发给被移除的人：他从没有过这一行）', () => {
    expect(audienceForHardDelete('document_member', { userId: 'removed' }, 'owner-1')).toEqual(['owner-1']);
  });

  it('document_member 取不到所有者 ⇒ 空（宁可不发，也不发错人）', () => {
    expect(audienceForHardDelete('document_member', { userId: 'removed' }, null)).toEqual([]);
    expect(audienceForHardDelete('document_member', { userId: 'removed' })).toEqual([]);
  });

  it('notification → 收件人（userId）', () => {
    expect(audienceForHardDelete('notification', { userId: 'reader' })).toEqual(['reader']);
    expect(audienceForHardDelete('notification', {})).toEqual([]);
  });

  it('其余表没有墓碑面 ⇒ 空数组（不发明受众）', () => {
    expect(audienceForHardDelete('document', { userId: 'owner' }, 'owner')).toEqual([]);
    expect(audienceForHardDelete('task', { userId: 'owner' })).toEqual([]);
  });
});

describe('G1643：墓碑行与增量记录', () => {
  it('同一受众去重、空 userId 丢弃；确定性命让重复删除幂等', () => {
    const rows = tombstoneRows(
      { table: 'document_member', recordId: 'm1', audience: ['a', 'a', '', 'b'] },
      '2026-11-20T00:00:00.000Z',
    );
    expect(rows.map((row) => row.userId)).toEqual(['a', 'b']);
    expect(rows[0]!.id).toBe(tombstoneId('document_member', 'm1', 'a'));
    // 同一个 (table, recordId, userId) 两次调用给出同一个 id
    expect(tombstoneRows({ table: 'document_member', recordId: 'm1', audience: ['a'] }, '2026-11-21T00:00:00.000Z')[0]!.id)
      .toBe(rows[0]!.id);
  });

  it('墓碑翻成增量记录：op=delete、id 取被删行、syncTs 归一成 ISO', () => {
    expect(tombstoneToRecord({
      table: 'notification', recordId: 'n1', syncTs: '2026-11-20 08:00:00+08',
    })).toEqual({
      table: 'notification', id: 'n1', op: 'delete', syncTs: '2026-11-20T00:00:00.000Z',
    });
  });
});
