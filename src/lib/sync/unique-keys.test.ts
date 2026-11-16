// src/lib/sync/unique-keys.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SYNC_TABLES } from './tables';
import { UNIQUE_KEY_LOCATORS } from './unique-keys';

/**
 * `gap.md` G1627 —— R-19 的定位器名单此前是**手抄**的：`src/prisma/contract.json` 里
 * 某张同步表加了唯一约束、而 `UNIQUE_KEY_LOCATORS` 没跟着加，那条路径就退化成
 * 「create 抛唯一约束 → 事务进 aborted 态（SQLSTATE 25P02）→ 整批 500 → 客户端无限重推」
 * ＝G1625／G1626 同族的毒批次，只是触发条件从"缺必填列"换成"撞唯一键"。
 *
 * 这道闸从契约**现读**每张同步表的唯一约束，逐条要求在定位器名单里有一份 `columns` 与之
 * 逐列相同；覆盖不了的那几条（slug／shareToken／email／userId／taskId+remindAt）必须
 * 逐条登记豁免理由——理由写不出来就说明它其实是真缺口。
 *
 * ☆ 为什么不是"凡唯一约束必有定位器"：有些唯一键的写入路径根本不经过 sync 的 create 支路
 * （服务端 action 自家先查、或该表从不在内核里建行），配一个定位器只会让代码更难读。
 */
const CONTRACT = join(process.cwd(), 'src', 'prisma', 'contract.json');

interface ContractShape {
  domain: { namespaces: { public: { models: Record<string, { storage: { table: string } }> } } };
  storage: { namespaces: { public: { entries: { table: Record<string, {
    uniques?: { columns: string[] }[];
  }> } } } };
}

const contract = JSON.parse(readFileSync(CONTRACT, 'utf8')) as ContractShape;
const models = contract.domain.namespaces.public.models;
const storage = contract.storage.namespaces.public.entries.table;

/**
 * 不配定位器的唯一约束，逐条写明"为什么这条撞不上"。键是 `table:col1,col2`。
 * 每条都必须能指向一条**不经 sync create** 的写入路径，否则就是真缺口。
 */
const LOCATOR_EXEMPTIONS: Record<string, string> = {
  // `user` 行由登录/注册流程建；sync 侧 where 恒为 {id: 会话用户}，create 只在
  // 「本行已存在但 where 定位不到」这种自相矛盾的输入下发生，而 route 上游已拒 id≠会话用户。
  'user:email': 'user 行不进内核 create（登录流程建行）',
  // 只有服务端 action 建行（createCustomStyle），内核唯一写＝改名/设默认。
  'customStyle:name': 'customStyle 行不进内核 create（服务端 action 建行）',
  'customStyle:userId': '同上',
  // 服务端生成的提醒（materialize / daily-digest / comment-notifications），客户端只写 readAt/isResolved。
  'notification:taskId,remindAt': 'notification 行不进内核 create（投递侧生成）',
  // 该表目前只有服务端读（first({userId})），没有任何 create 通路。
  'daily_notes_config:userId': 'daily_notes_config 行不进内核 create（当前无建行通路）',
  // 分享行的 token 由服务端 `getOrCreateShare` 生成：面板补种那笔带的 token 就是服务端那行的
  // token ⇒ 若服务端已有该行，pk 定位会命中并 update；到 create 分支说明这枚 token 从未落库。
  'document_share:token': 'token 由服务端生成，seed 那笔的 token 必然命中已有行',
  // slug 只经 `setShareSlug` action 写（该 action 自己先 `first({slug})` 查重），sync 载荷不带 slug。
  'document_share:slug': 'slug 只经服务端 action 写且自带查重，sync 载荷不带该列',
  // 白板只有面包屑改名走内核（且已配 createRequires ['name','isDeleted']），shareToken 由
  // `createWhiteboard` action 生成；内核 patch 不带该列。
  'whiteboard:shareToken': 'shareToken 只由服务端 action 生成，内核 patch 不带该列',
};

describe('G1627：唯一键定位器覆盖契约的唯一约束', () => {
  function uniquesFor(table: string): { columns: string[] }[] {
    const def = SYNC_TABLES.find((d) => d.table === table);
    if (!def) throw new Error(`${table} 不在 SYNC_TABLES＝判据失效`);
    const tableName = models[def.model]?.storage.table;
    if (!tableName) throw new Error(`contract 里没有模型 ${def.model}＝判据失效`);
    const entry = storage[tableName];
    if (!entry) throw new Error(`contract 里没有表 ${tableName}＝判据失效`);
    return entry.uniques ?? [];
  }

  it('每一张同步表：契约的每条唯一约束要么有逐列相同的定位器，要么登记了豁免理由', () => {
    const uncovered: string[] = [];
    let covered = 0, exempted = 0;
    for (const def of SYNC_TABLES) {
      for (const unique of uniquesFor(def.table)) {
        const key = `${def.table}:${unique.columns.join(',')}`;
        const locator = UNIQUE_KEY_LOCATORS[def.table];
        if (locator && [...locator.columns].join(',') === unique.columns.join(',')) {
          covered += 1;
          continue;
        }
        if (LOCATOR_EXEMPTIONS[key]) {
          exempted += 1;
          continue;
        }
        uncovered.push(key);
      }
    }
    // 防空夹具假绿：两侧都得有真命中，否则说明契约解析或名单都失效了
    expect(covered, '一份定位器都没对上＝判据失效，请复核契约解析').toBeGreaterThan(0);
    expect(exempted, '一条豁免都没命中＝豁免名单写错了表名').toBeGreaterThan(0);
    expect(uncovered, uncovered.map((k) => `${k} 有唯一约束但无定位器也无豁免`).join('\n')).toEqual([]);
  });

  it('定位器不凭空发明列：每一份 columns 都真在契约的某条唯一约束里', () => {
    for (const [table, locator] of Object.entries(UNIQUE_KEY_LOCATORS)) {
      const columns = locator.columns.join(',');
      const hit = uniquesFor(table).some((u) => u.columns.join(',') === columns);
      expect(hit, `${table} 的定位器列 ${columns} 在契约里不是唯一约束（改了列名要同步两边）`).toBe(true);
    }
  });

  it('定位器只登记同步表里真存在的表（拼错表名＝那条约束静默无闸）', () => {
    for (const table of Object.keys(UNIQUE_KEY_LOCATORS)) {
      expect(SYNC_TABLES.some((d) => d.table === table), `${table} 不在 SYNC_TABLES`).toBe(true);
    }
  });

  it('豁免名单没有一行是"白拿的"：若某条约束其实有同列定位器，豁免就必须删掉', () => {
    const stale: string[] = [];
    for (const key of Object.keys(LOCATOR_EXEMPTIONS)) {
      const [table, cols] = key.split(':');
      const locator = UNIQUE_KEY_LOCATORS[table!];
      if (locator && [...locator.columns].join(',') === cols) stale.push(key);
    }
    expect(stale, `这些约束已有定位器，豁免条目过期：${stale.join(', ')}`).toEqual([]);
  });

  it('每一枚定位器都真产 where：给它一份完整 key，得到的正是那几列值', () => {
    // 空 key 必须给 null（否则会用 undefined 去 `first()`，在真库上等于全表扫一枚任意行）
    for (const [table, locator] of Object.entries(UNIQUE_KEY_LOCATORS)) {
      expect(locator.where({}, 'session-user'), `${table} 对空 key 返回了非 null`).toBeNull();
      const key: Record<string, unknown> = {};
      for (const col of locator.columns) key[col] = `${col}-value`;
      const where = locator.where(key, 'session-user');
      expect(where, `${table} 对完整 key 返回 null`).not.toBeNull();
      for (const col of locator.columns) {
        expect(where![col], `${table}.${col} 没进 where`).toBeTruthy();
      }
    }
  });

  it('会话用户为作用域的那几张表不带 payload 的 userId（防止越权定位他人行）', () => {
    // tag / favorite / block_reminder / comment_reaction 的 userId 是**会话用户**：哪怕 payload
    // 里塞了别人的 userId，where 也必须用会话那一枚。document_member 反过来——它的 userId 是
    // 被授权成员（邀请对象），只能取 payload。
    for (const table of ['tag', 'favorite', 'block_reminder', 'comment_reaction']) {
      const locator = UNIQUE_KEY_LOCATORS[table]!;
      const key: Record<string, unknown> = {};
      for (const col of locator.columns) key[col] = col === 'userId' ? 'someone-else' : `${col}-value`;
      const where = locator.where(key, 'session-user');
      if (locator.columns.includes('userId')) {
        expect(where!.userId, `${table} 用了 payload 里的 userId＝可越权定位他人行`).toBe('session-user');
      }
    }
    const memberKey = { documentId: 'd1', userId: 'invitee' };
    expect(UNIQUE_KEY_LOCATORS.document_member!.where(memberKey, 'session-user')!.userId).toBe('invitee');
  });
});