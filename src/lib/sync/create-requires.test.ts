// src/lib/sync/create-requires.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SYNC_TABLES } from './tables';

/**
 * `gap.md` G1626 —— G1505 铸造闸是**缺省放行**：`route.ts` 判的是
 * `(def.createRequires ?? []).every(k => k in payload)`，而空数组对 `every` 是真 ⇒
 * 没配闸的表（第 554 批时是 11/21 张）任何单点 patch 都能走到 `model.create`。
 * 一旦那枚 patch 缺了该表的 NOT NULL 列，`create` 抛错 ⇒ 整个事务进 aborted 态
 * （SQLSTATE 25P02）⇒ 后续语句全部拒绝 ⇒ 整批 500 ⇒ 客户端无限重推同一笔。
 * 这与 G1625 修掉的「撞唯一键」是同一个毒批次家族，只是触发条件从唯一键换成了必填列。
 *
 * 所以 `createRequires` 不能只当"形状判据"随手配：它的**下限**是契约必填列。
 * 这道闸从 `src/prisma/contract.json` 现读每一列的 nullable/default，现算下限，
 * 再逐表断言 `createRequires ⊇ 下限` —— 于是"新加一张同步表忘了配闸"或
 * "contract 加了一列 NOT NULL 却没同步进名单"都当场红，不必等人真机撞出 500。
 */
const CONTRACT = join(process.cwd(), 'src', 'prisma', 'contract.json');

interface ContractField {
  type: { kind: string };
}
interface ContractColumn {
  nullable: boolean;
  default?: { kind: string; value?: unknown; expression?: string } | null;
}
interface ContractModel {
  fields: Record<string, ContractField>;
  relations: Record<string, { on: { localFields: string[] } }>;
  storage: { table: string };
}

interface ContractShape {
  domain: { namespaces: { public: { models: Record<string, ContractModel> } } };
  storage: { namespaces: { public: { entries: { table: Record<string, {
    columns: Record<string, ContractColumn>;
  }> } } } };
  execution: { mutations: { defaults: { ref: { table: string; column: string } }[] } };
}

const contract = JSON.parse(readFileSync(CONTRACT, 'utf8')) as ContractShape;
const models = contract.domain.namespaces.public.models;
const storage = contract.storage.namespaces.public.entries.table;

/**
 * 服务端在 create 时无条件覆盖 `payload.userId` 的表（现读 `route.ts` 的 `USER_ID_TABLES`，
 * 与 `tables.test.ts` 同一手法：不在这份测试里另抄一份，两处会各说各话）。
 * 这些表的 `userId` 不算客户端必填；`document_member` 不在其中 ⇒ 它的 userId 真要客户端带。
 */
function serverOwnedUserIdTables(): Set<string> {
  const src = readFileSync(join(process.cwd(), 'src', 'app', 'api', 'v1', 'sync', 'route.ts'), 'utf8');
  const block = /const USER_ID_TABLES = new Set\(\[([\s\S]*?)\]\);/.exec(src);
  if (!block) throw new Error('找不到 USER_ID_TABLES＝判据失效，请复核这条闸');
  return new Set([...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
}

/**
 * 一张同步表「客户端 create 必须自带」的列集合。逐列四条排除，缺一条就多算一列、把正常
 * 建行判成 not_found（那与放行过头是同样严重的产品 bug，所以这里逐条写清理由）：
 *  1. `id`：主键由 route 侧统一填（`model.create({..., id: rec.id})`）；
 *  2. 列上带 `default`：storage 里的字面默认 / `now()` 函数默认，create 不带也能落；
 *  3. `execution.mutations.defaults` 里挂了 onCreate 生成器（如 `updatedAt` 的
 *     `timestampNow`）：那是 DB 侧默认，同 2；
 *  4. `userId` 且该表 ∈ `USER_ID_TABLES`：服务端覆盖，见上。
 * 关系列（外键）不从 `domain.relations` 取，因为它们在 `storage.columns` 里就是普通列，
 * 走同一套 nullable/default 判定即可——这里不为"看起来更准"多引一条数据源。
 */
function contractRequiredColumns(modelName: string, table: string, ownedUserId: Set<string>): string[] {
  const model = models[modelName];
  if (!model) throw new Error(`contract 里没有模型 ${modelName}＝判据失效`);
  const cols = storage[model.storage.table]?.columns;
  if (!cols) throw new Error(`contract 里没有表 ${model.storage.table}＝判据失效`);
  const generated = new Set(
    contract.execution.mutations.defaults
      .filter((d) => d.ref.table === model.storage.table)
      .map((d) => d.ref.column),
  );
  return Object.entries(model.fields)
    .filter(([name, field]) => {
      if (field.type.kind !== 'scalar') return false;      // 关系列不直接落库为该名
      if (name === 'id') return false;                     // 1
      const col = cols[name];
      if (!col) return false;
      if (col.nullable) return false;
      if (col.default != null) return false;               // 2
      if (generated.has(name)) return false;               // 3
      if (name === 'userId' && ownedUserId.has(table)) return false; // 4
      return true;
    })
    .map(([name]) => name);
}

/**
 * 没有客户端 create 通路的表：内核里从不 `applyLocal` 建行，`create` 只可能来自
 * 「陈旧行上的单点动作」——那本来就是该被闸挡住的那一类，故配了闸只有坏处。
 * 逐张写明各自的写面（判据失效时这里是最先该被怀疑的地方）：
 *  - `user`：设置行由登录流程建，内核只写偏好列（`Preferences` 由 G03 那道闸守）；
 *  - `customStyle`：只有 `actions/style/custom-styles.ts` 的服务端 action 建行；
 *  - `notification`：服务端生成的提醒，客户端只写 readAt/isResolved；
 *  - `daily_notes_config`：只有 `actions/…` 服务端 action 写，且契约零必填列。
 * 每次往这张表里加一项，都要先答"它的离线新建走哪条 applyLocal"——答不出就不许进。
 */
const NO_CLIENT_CREATE = ['user', 'customStyle', 'notification', 'daily_notes_config'] as const;

describe('G1626：createRequires 覆盖契约必填列（铸造闸不得缺省放行）', () => {
  const ownedUserId = serverOwnedUserIdTables();
  const exempt = new Set<string>(NO_CLIENT_CREATE);

  it('每一张同步表的 createRequires 都盖住 contract 算出的客户端必填列', () => {
    expect(SYNC_TABLES.length, 'SYNC_TABLES 空了＝判据失效').toBeGreaterThanOrEqual(20);
    const shortfalls: string[] = [];
    for (const def of SYNC_TABLES) {
      if (exempt.has(def.table)) continue; // 没有客户端建行面 ⇒ 这枚闸对它们无话可说（下一枚钉住名单）
      const required = contractRequiredColumns(def.model, def.table, ownedUserId);
      const have = new Set(def.createRequires ?? []);
      const missing = required.filter((c) => !have.has(c));
      if (missing.length) {
        shortfalls.push(`${def.table}（${def.model}）缺 ${missing.join(', ')} ⇒ create 会 25P02 打崩整批`);
      }
    }
    expect(shortfalls, shortfalls.join('\n')).toEqual([]);
  });

  it('豁免名单只有真没有客户端建行面的表，且没有表靠豁免躲过这条闸', () => {
    // 反向：名单里的表必须都真在册（写错名字＝静默豁免了不存在的表）
    for (const t of exempt) {
      expect(SYNC_TABLES.some((d) => d.table === t), `${t} 不在 SYNC_TABLES＝豁免名单写错`).toBe(true);
    }
    // 正向：除豁免名单外，每张表都必须配闸——把"忘了配"这件事本身钉死，
    // 不让第 554 批那种 11/21 张无闸的形态靠"这张恰好没被测到"溜过去。
    for (const def of SYNC_TABLES) {
      if (exempt.has(def.table)) continue;
      const keys = def.createRequires ?? [];
      expect(keys.length, `${def.table} 没配 createRequires＝铸造闸对它是缺省放行`).toBeGreaterThan(0);
      // 下限那枚 asserting 在上一枚里；这里补的是"形状判据不是空转"：至少有一枚键
      // 是该表的必填列，否则闸放过的 patch 仍然能铸出缺必填列的壳行。
      const required = contractRequiredColumns(def.model, def.table, ownedUserId);
      if (required.length) {
        expect(keys.some((k) => required.includes(k)), `${def.table} 的闸没有一枚落在必填列上`).toBe(true);
      }
    }
  });

  it('createRequires 的每一枚键都必须在该表 cols 里（否则求交后永远带不上，那张表再也建不出行）', () => {
    for (const def of SYNC_TABLES) {
      for (const k of def.createRequires ?? []) {
        expect(def.cols, `${def.table}.${k} 不在 cols`).toContain(k);
      }
    }
  });

  it('契约侧确有必填列可算（防空判据假绿）：document_member 的 userId 必须被算出来', () => {
    // document_member 不在 USER_ID_TABLES ⇒ userId 是客户端必填。这一枚是整条推导的锚：
    // 若哪天解析器把 userId 误当成服务端代填（或把 nullable 判反），这条先红，
    // 而不是等到真实 create 撞 NOT NULL 才在生产里发现。
    expect(contractRequiredColumns('DocumentMember', 'document_member', ownedUserId))
      .toEqual(expect.arrayContaining(['documentId', 'userId']));
    // 反面锚：Favorite 在 USER_ID_TABLES 里 ⇒ userId 不算客户端必填
    expect(contractRequiredColumns('Favorite', 'favorite', ownedUserId))
      .toEqual(['documentId']);
  });
});
