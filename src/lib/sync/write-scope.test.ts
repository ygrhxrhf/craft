// src/lib/sync/write-scope.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SYNC_TABLES } from './tables';
import { WRITE_SCOPES } from './write-scope';

/**
 * `gap.md` G1633 —— 写侧归属的**声明面闸**。
 *
 * 背景是 G1523／G1628 那两个洞的共同形状：GET 侧按归属收窄的名单长、POST 侧逐表比档的名单短，
 * 而且**每补一次只补一处**（G1523 补了文档四表、G1628 补了集合四表，`comment` 一直没被看见）。
 * 洞的后果不是"多点一次没反应"，是**任何登录用户都能往别人的数据里铸行**：
 *  - 无 userId 的表：where 只剩 `{id}`／`{documentId,tagId}`；
 *  - 有 userId 的表但 userId 是**写入者**（`comment`）：where 收窄的是写入者自己的行，
 *    归属（`threadId` → 文档）一次都没判 ⇒ 可以在别人的评论线程里插话。
 *
 * 闸从 `contract.json` 现读每张同步表的引用列，按"归属可从哪一列追出去"逐表分档：
 *  - 有 `threadId` ⇒ 必须走文档作用域且归属列就是 threadId（新增评论类表漏配即红）；
 *  - 有 `documentId`／`collectionId`／`itemId` 而无 userId ⇒ 必须在 `WRITE_SCOPES` 里；
 *  - 有 userId 的表必须已被服务端 `USER_ID_TABLES` 收窄（otherwise where 只剩 `{id}`）。
 * 名单本身在 `write-scope.ts`，route 只消费——与 G1627（唯一键定位器）同一手法。
 */
const CONTRACT = join(process.cwd(), 'src', 'prisma', 'contract.json');
const ROUTE = join(process.cwd(), 'src', 'app', 'api', 'v1', 'sync', 'route.ts');

interface ContractShape {
  domain: { namespaces: { public: { models: Record<string, {
    fields: Record<string, { type: { kind: string } }>;
  }> } } };
}

const contract = JSON.parse(readFileSync(CONTRACT, 'utf8')) as ContractShape;
const models = contract.domain.namespaces.public.models;

const REF_FIELDS = ['userId', 'documentId', 'threadId', 'collectionId', 'itemId'] as const;

/** 服务端写侧把 where／payload 收窄到会话用户的表（从 route.ts 现读，不在本文件抄一份）。
 *  ☆ 字符类必须收大写：表名里有 `customStyle`——`[a-z_]+` 会把它整枚漏掉（同一份正则的
 *    姊妹闸 `create-requires.test.ts`／`tables.test.ts` 就踩过这个坑），锚一下最下方那条断言。 */
function serverUserIdTables(): Set<string> {
  const src = readFileSync(ROUTE, 'utf8');
  const block = /const USER_ID_TABLES = new Set\(\[([\s\S]*?)\]\);/.exec(src);
  if (!block) throw new Error('找不到 USER_ID_TABLES＝判据失效，请复核这条闸');
  return new Set([...block[1].matchAll(/'([A-Za-z_]+)'/g)].map((m) => m[1]));
}

function contractRefs(model: string): Set<string> {
  const m = models[model];
  if (!m) throw new Error(`contract 里没有模型 ${model}＝判据失效`);
  return new Set(REF_FIELDS.filter((f) => m.fields[f]?.type.kind === 'scalar'));
}

/** 没有归属引用的表（`user` 是唯一一张：where 恒 `{id: 会话用户}`，payload 也只写本人设置）。 */
const NO_OWNERSHIP_REF = ['user'] as const;

/**
 * 有 userId 但 `USER_ID_TABLES` 收窄不到的**唯一**一张：`document_member.userId` 是被授权成员
 * （不是会话用户），它的归属走 `documentId` → 文档作用域（owner 档）。再加一张这样的表之前，
 * 先回答"它的归属列是哪一枚"，答不出就不许进。
 */
const USER_ID_IS_GRANTEE = ['document_member'] as const;

describe('G1633：写侧归属声明面（WRITE_SCOPES 覆盖全部引用列）', () => {
  const userIdTables = serverUserIdTables();
  const exempt = new Set<string>([...NO_OWNERSHIP_REF, ...USER_ID_IS_GRANTEE]);

  it('每张同步表的归属引用都有归宿：声明面 / 服务端 userId 收窄 / 登记的豁免', () => {
    expect(SYNC_TABLES.length, 'SYNC_TABLES 空了＝判据失效').toBeGreaterThanOrEqual(20);
    const uncovered: string[] = [];
    for (const def of SYNC_TABLES) {
      const refs = contractRefs(def.model);
      if (refs.size === 0 || exempt.has(def.table)) continue;
      const scope = WRITE_SCOPES[def.table];
      if (scope) continue;
      // 不在声明面里的，只剩"服务端按 userId 收窄"这一条合法通路
      if (userIdTables.has(def.table)) {
        // 有 userId 收窄 ≠ 归属已判：threadId 指向的线程属于别人的文档，userId 只说明
        // "这行是谁写的"。这类表必须进声明面，不能靠 userId 蒙混。
        if (!refs.has('threadId')) continue;
        uncovered.push(`${def.table}（${def.model}）带 threadId 却没进 WRITE_SCOPES ⇒ 可往别人的评论线程里插行`);
        continue;
      }
      uncovered.push(`${def.table}（${def.model}）既不在 WRITE_SCOPES 也不在 USER_ID_TABLES ⇒ where 只剩 {id}，可跨用户写`);
    }
    expect(uncovered, uncovered.join('\n')).toEqual([]);
  });

  it('带 threadId 的同步表必须走 threadId → 文档 作用域（comment 是今天唯一一张）', () => {
    const withThread = SYNC_TABLES.filter((d) => contractRefs(d.model).has('threadId'));
    expect(withThread.map((d) => d.table), 'comment 不再是唯一带 threadId 的同步表＝判据可能已过期').toContain('comment');
    for (const def of withThread) {
      const scope = WRITE_SCOPES[def.table];
      expect(scope, `${def.table} 带 threadId 却没有写侧作用域`).toBeDefined();
      expect(scope, `${def.table} 的写侧作用域必须经 threadId 两跳`).toMatchObject({
        kind: 'document',
        field: 'threadId',
      });
    }
  });

  it('声明面里每一格都能落地：表在册、归属列在 cols、档位合法', () => {
    const levels = ['viewer', 'commenter', 'editor', 'owner'];
    for (const [table, scope] of Object.entries(WRITE_SCOPES)) {
      const def = SYNC_TABLES.find((d) => d.table === table);
      expect(def, `${table} 不在 SYNC_TABLES＝声明面写错表名`).toBeDefined();
      if (scope.kind === 'document') {
        expect(levels, `${table} 的档位 ${scope.level} 不在词表里`).toContain(scope.level);
        expect(def!.cols, `${table}.${scope.field} 不在 cols ⇒ 求交后永远带不上这一列`).toContain(scope.field);
        expect(models[def!.model].fields[scope.field]?.type.kind, `${table} 的模型没有 ${scope.field} 列`).toBe('scalar');
      } else {
        const refs = contractRefs(def!.model);
        expect(refs.has('collectionId') || refs.has('itemId'), `${table} 标成集合作用域却没有 collectionId／itemId`).toBe(true);
      }
    }
  });

  it('逐表档位逐档钉死（松一档就会在 diff 里现形）', () => {
    expect(Object.fromEntries(
      Object.entries(WRITE_SCOPES).map(([table, scope]) =>
        [table, scope.kind === 'document' ? `${scope.field}@${scope.level}` : 'collection']),
    )).toEqual({
      document_tag: 'documentId@editor',
      comment_thread: 'documentId@commenter',
      document_share: 'documentId@owner',
      document_member: 'documentId@owner',
      comment: 'threadId@commenter',
      collection_item: 'collection',
      collection_property: 'collection',
      collection_view: 'collection',
      collection_value: 'collection',
    });
  });

  it('route.ts 真的消费这份声明面（不是测试里绿、线上走旧常量）', () => {
    const src = readFileSync(ROUTE, 'utf8');
    expect(src, 'route.ts 没有引用 WRITE_SCOPES＝声明面没接线').toContain("from '@/lib/sync/write-scope'");
    expect(src, 'route.ts 仍按表名分派、没用 WRITE_SCOPES[rec.table]').toContain('WRITE_SCOPES[rec.table]');
    expect(src, 'route.ts 还留着旧的手抄档位表 DOC_WRITE_LEVEL').not.toContain('DOC_WRITE_LEVEL');
    // 锚住上面那条现读：名单里的 `customStyle` 必须被解析到（否则"服务端已收窄"是假绿）
    expect(userIdTables.has('customStyle'), 'USER_ID_TABLES 的现读漏了带大写的表名').toBe(true);
  });
});
