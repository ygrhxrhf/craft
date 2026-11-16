import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SYNC_TABLES } from '@/lib/sync/tables';

/**
 * `gap.md` G1639 —— 同步载荷里的**外键悬空**。Postgres 对每个 N:1 关系都有真外键（本仓迁移生成
 * 的是 `ON DELETE CASCADE / SET NULL`），而客户端载荷里的引用列此前只被判过归属（写侧作用域
 * 那几张表），从没被判过"被引用的那一行还在不在"。两台设备各干各的就撞得上：一台永久删除
 * 一篇文档，另一台离线时收藏了它 ⇒ 重连后那笔 `favorite` 的 `documentId` 指向已不存在的行
 * ⇒ 语句报 FK 违例 ⇒ 整个事务 aborted（25P02）⇒ 整批 500 ⇒ 无限重推（G1625 家族，
 * 触发条件换成"悬空引用"）。
 *
 * 处置分两档，按**目标列可不可空**（契约 storage.columns）：
 *  - 可空 ⇒ 把那一枚引用置 `null` 后照常落库（文档的父页没了就落到根，与客户端 `adoptOrphans`
 *    对墓碑父行的处置同一条语义）——把用户的工作整份丢掉比引用悬空更糟；
 *  - 非空 ⇒ 这一笔永远不可能成功，逐笔拒收（`reason: 'not_found'`）。
 *
 * 判据从 `contract.json` 现读 N:1 关系，与 `WRITE_SCOPES`／`UNIQUE_KEY_LOCATORS`／`purgePlan`
 * 同一手法；`references.test.ts` 逐表核对"载荷能写的外键列都在册"，新增一张带外键的同步表
 * 而这里没跟时那边先红。
 */
export interface SyncReference {
  /** 载荷里的本地列。 */
  field: string;
  /** Prisma 模型名（`db.orm.public.<model>`）。 */
  model: string;
  /** 目标表的定位列（契约 `on.targetFields`，几乎都是 `id`）。 */
  target: string;
  /** 这一列在契约里可不可空（决定悬空时"置空"还是"拒收"）。 */
  nullable: boolean;
}

interface ContractShape {
  domain: { namespaces: { public: { models: Record<string, {
    relations?: Record<string, {
      cardinality: string;
      on?: { localFields?: string[]; targetFields?: string[] };
      to?: { model: string };
    }>;
    storage: { table: string };
  }> } } };
  storage: { namespaces: { public: { entries: { table: Record<string, {
    columns: Record<string, { nullable: boolean }>;
  }> } } } };
}

let cached: Map<string, SyncReference[]> | null = null;

export function syncReferences(): Map<string, SyncReference[]> {
  if (cached) return cached;
  const proc = (globalThis as { process?: NodeJS.Process }).process;
  const contract = JSON.parse(
    readFileSync(join(proc!.cwd(), 'src', 'prisma', 'contract.json'), 'utf8'),
  ) as ContractShape;
  const models = contract.domain.namespaces.public.models;
  const tables = contract.storage.namespaces.public.entries.table;

  const out = new Map<string, SyncReference[]>();
  for (const def of SYNC_TABLES) {
    const model = models[def.model];
    if (!model) continue;
    const columns = tables[model.storage.table]?.columns ?? {};
    const refs: SyncReference[] = [];
    for (const rel of Object.values(model.relations ?? {})) {
      if (rel.cardinality !== 'N:1') continue;                 // 1:N / 1:1 那条边不在本行上
      const local = rel.on?.localFields ?? [];
      const target = rel.on?.targetFields ?? [];
      if (local.length !== 1 || target.length !== 1) continue; // 复合外键：本仓同步表里没有
      const field = local[0]!;
      // 只判"载荷里真能写"的列：白名单外的键会被求交丢掉，判了也没有意义。
      if (!def.cols.includes(field)) continue;
      const targetModel = rel.to?.model;
      if (!targetModel || !models[targetModel]) continue;
      // `User` 目标不判：账号在本仓不可删除（账户删除是 deliberate，没有通路），会话用户那一行
      // 由 `requireUserId` 保证在册，成员邀请那枚 userId 也由服务端 action 先解析成真账号。
      // 判它只会给每一笔带 userId 的写多一次读（200 笔一批就是 200 次），收益为零。
      if (targetModel === 'User') continue;
      refs.push({
        field,
        model: targetModel,
        target: target[0]!,
        nullable: columns[field]?.nullable !== false,
      });
    }
    if (refs.length) out.set(def.table, refs);
  }
  cached = out;
  return out;
}

/** 一批之内的存在性缓存（同一批 200 笔常引用同几行，逐笔各查一次会把读放大成 N 倍）。 */
export interface ExistenceCache {
  seen: Map<string, boolean>;
}

export function createExistenceCache(): ExistenceCache {
  return { seen: new Map() };
}

async function exists(
  scope: any,
  model: string,
  target: string,
  value: string,
  cache: ExistenceCache,
): Promise<boolean> {
  const key = `${model}.${target}=${value}`;
  const hit = cache.seen.get(key);
  if (hit !== undefined) return hit;
  const row = await scope.orm.public[model].first({ [target]: value });
  const found = Boolean(row);
  cache.seen.set(key, found);
  return found;
}

/**
 * 载荷里所有**指向不存在的行**的外键。`null`／缺列不判（清空引用是合法动作）；空串按悬空处理
 * ——Postgres 会把它当成一个真值去查外键，那一笔同样只会把事务打崩。
 *
 * ☆ 同批父行不用特判：这些读发生在**同一个事务**里，前面刚 `create` 的行对本事务的 SELECT
 *   可见 ⇒ 离线"先建父、后建子"那两笔（队列按 createdAt 升序）天然能通过。`minted` 只是把
 *   这件事说给测试替身听（替身没有事务可见性），顺带省掉同一批里重复的存在性读。
 */
export async function danglingReferences(
  scope: any,
  table: string,
  payload: Record<string, unknown> | undefined,
  cache: ExistenceCache,
  minted: ReadonlySet<string> = new Set(),
): Promise<SyncReference[]> {
  if (!payload) return [];
  const out: SyncReference[] = [];
  for (const ref of syncReferences().get(table) ?? []) {
    if (!(ref.field in payload)) continue;
    const raw = payload[ref.field];
    if (raw === null || raw === undefined) continue;
    if (typeof raw !== 'string') continue;  // 非字符串值是值类型闸的事
    if (raw === '') {
      out.push(ref);
      continue;
    }
    if (minted.has(`${ref.model}::${raw}`)) continue;
    if (!(await exists(scope, ref.model, ref.target, raw, cache))) out.push(ref);
  }
  return out;
}

/**
 * 批内**引用排序**：把"引用某行、而那一行在批里更靠后"的记录挪到它的提供者之后。
 *
 * 为什么必须有这一步：`applyLocal` 的合并语义是"同 (table,id) 只留一条、用新的 createdAt"
 * ——离线时先建父页、再建子页、随后又改了父页名，父页那一笔会**跳到子页之后**。服务端按批内
 * 顺序执行，子页插入时父页尚不存在：修前是 FK 违例 ⇒ 事务 aborted ⇒ 整批 500 ⇒ 无限重推；
 * 加上悬空闸后则会变成"子页被拒收"——两样都比"先插父页"更糟。所以闸之前先把顺序理对。
 *
 * 稳定拓扑：反复取"提供者都已就位或不在批内"的记录，保持原相对顺序；成环时把剩下的按原序
 * 追加——那几笔本来就永远不可能成功，交给调用方的悬空闸逐笔拒收，不要让整批陪葬。
 */
export function orderByReferences(records: any[]): any[] {
  const refs = syncReferences();
  const defOf = (rec: any) => SYNC_TABLES.find((d) => d.table === rec.table) ?? null;

  // 每个 (model, id) 的提供者下标；只有 upsert 能"提供"一行。
  const provider = new Map<string, number>();
  records.forEach((rec, index) => {
    const def = defOf(rec);
    if (!def || rec.op !== 'upsert' || typeof rec.id !== 'string') return;
    provider.set(`${def.model}::${rec.id}`, index);
  });

  const pending = records.map((_, index) => index);
  const emitted = new Set<number>();
  const order: any[] = [];
  for (;;) {
    let progress = false;
    for (let at = 0; at < pending.length; at += 1) {
      const index = pending[at]!;
      if (emitted.has(index)) continue;
      const rec = records[index]!;
      const def = defOf(rec);
      let ready = true;
      if (def && rec.op === 'upsert' && rec.data) {
        for (const ref of refs.get(rec.table) ?? []) {
          const value = rec.data[ref.field];
          if (typeof value !== 'string' || value === '') continue;
          const providerIndex = provider.get(`${ref.model}::${value}`);
          if (providerIndex !== undefined && providerIndex !== index && !emitted.has(providerIndex)) {
            ready = false;
            break;
          }
        }
      }
      if (!ready) continue;
      emitted.add(index);
      order.push(rec);
      progress = true;
    }
    if (!progress) break;
  }
  for (const index of pending) {
    if (!emitted.has(index)) order.push(records[index]);
  }
  return order;
}
