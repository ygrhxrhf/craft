import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SYNC_TABLES } from '@/lib/sync/tables';

/**
 * `gap.md` G1632 —— 墓碑 30 天懒清理的**表清单**此前是手抄的（11 张），而同步表里带 `deletedAt`
 * 的一共 17 张：`customStyle`／`collection_item`／`collection_property`／`collection_value`／
 * `collection_view`／`block_reminder` 六张的墓碑**永远不被清**，于是它们永久留在库里，并且
 * 每一次全量 pull（新设备 boot、或 30 天没开过的设备）都要把这几张表的历史墓碑整批发一遍。
 * spec 6.4 的前提是"墓碑只保留 30 天、客户端游标不可能比 30 天更旧"——清单漏表就打破了它。
 *
 * 这里改成从 `SYNC_TABLES` + `contract.json` **现算**：带 `deletedAt` 列的同步表都进清理轮转，
 * 身份列取契约的 `primaryKey`（唯一例外是 `document_tag` 的复合键，契约里就是两列）。
 * `purge-plan.test.ts` 对两侧逐表核对，新增一张带墓碑的同步表而这里没跟上时那边先红。
 */
export interface PurgePlanEntry {
  /** Prisma 模型名（`db.orm.public.<model>`）。 */
  model: string;
  /** 删行谓词的列（＝契约主键）。 */
  identity: string[];
}

interface ContractShape {
  domain: { namespaces: { public: { models: Record<string, { storage: { table: string } }> } } };
  storage: { namespaces: { public: { entries: { table: Record<string, {
    primaryKey?: { columns: string[] };
  }> } } } };
}

let cached: PurgePlanEntry[] | null = null;

export function purgePlan(): PurgePlanEntry[] {
  if (cached) return cached;
  const proc = (globalThis as { process?: NodeJS.Process }).process;
  const contract = JSON.parse(
    readFileSync(join(proc!.cwd(), 'src', 'prisma', 'contract.json'), 'utf8'),
  ) as ContractShape;
  const models = contract.domain.namespaces.public.models;
  const tables = contract.storage.namespaces.public.entries.table;

  const plan: PurgePlanEntry[] = [];
  for (const def of SYNC_TABLES) {
    // 只有"软删走 deletedAt"的表才有墓碑要清；硬删表（document_member）与未软删的表不进来。
    if (!def.cols.includes('deletedAt')) continue;
    const model = models[def.model];
    const table = model ? tables[model.storage.table] : undefined;
    const identity = table?.primaryKey?.columns;
    if (!identity?.length) {
      throw new Error(`contract 里取不到 ${def.model} 的主键＝墓碑清理判据失效`);
    }
    plan.push({ model: def.model, identity: [...identity] });
  }
  cached = plan;
  return plan;
}
