// src/lib/sync/purge-plan.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SYNC_TABLES } from './tables';
import { purgePlan } from './purge-plan';

/**
 * `gap.md` G1632 —— 墓碑 30 天懒清理的表清单此前是手抄的 11 张，而同步表里带 `deletedAt` 的
 * 一共 17 张：`customStyle`／`collection_item`／`collection_property`／`collection_value`／
 * `collection_view`／`block_reminder` 六张的墓碑**永远不被清**。它们永久留在库里，且每一次
 * 全量 pull（新设备 boot、或 30 天没开过的设备）都要把这几张表的历史墓碑整批发一遍——spec 6.4
 * 的前提（墓碑只保留 30 天、客户端游标不可能比 30 天更旧）就是这么被打破的。
 *
 * 现在清单从 `SYNC_TABLES` + 契约的 `primaryKey` 现算；这条闸做三件事：
 * ① 现算集合 == "带 deletedAt 的同步表"（新增一张带墓碑的表，这里先红）；
 * ② 每一份身份列都真等于契约主键（复合键 document_tag 靠这条钉住）；
 * ③ 硬删表（document_member）不在清单里——它没有 deletedAt，清了反而报错。
 */
const CONTRACT = join(process.cwd(), 'src', 'prisma', 'contract.json');

interface ContractShape {
  domain: { namespaces: { public: { models: Record<string, { storage: { table: string } }> } } };
  storage: { namespaces: { public: { entries: { table: Record<string, {
    primaryKey?: { columns: string[] };
  }> } } } };
}

const contract = JSON.parse(readFileSync(CONTRACT, 'utf8')) as ContractShape;

function primaryKeyOf(model: string): string[] {
  const m = contract.domain.namespaces.public.models[model];
  if (!m) throw new Error(`contract 里没有模型 ${model}`);
  const entry = contract.storage.namespaces.public.entries.table[m.storage.table];
  if (!entry?.primaryKey) throw new Error(`contract 里没有表 ${m.storage.table} 的主键`);
  return entry.primaryKey.columns;
}

describe('G1632：墓碑清理清单从同步表与契约现算', () => {
  it('清单 == 全部带 deletedAt 的同步表（漏一张就有一张表的墓碑永远不清）', () => {
    const expected = SYNC_TABLES.filter((d) => d.cols.includes('deletedAt')).map((d) => d.model);
    expect(expected.length, '一张带墓碑的表都没有＝判据失效').toBeGreaterThan(10);
    const actual = purgePlan().map((p) => p.model);
    expect([...actual].sort()).toEqual([...expected].sort());
  });

  it('身份列逐表等于契约主键（document_tag 的复合键靠这条钉住）', () => {
    for (const entry of purgePlan()) {
      expect(entry.identity, `${entry.model} 的身份列与契约主键不符`).toEqual(primaryKeyOf(entry.model));
    }
    // 两支锚：单列与复合键各一
    const tag = purgePlan().find((p) => p.model === 'DocumentTag')!;
    expect(tag.identity).toEqual(['documentId', 'tagId']);
    const doc = purgePlan().find((p) => p.model === 'Document')!;
    expect(doc.identity).toEqual(['id']);
  });

  it('硬删表不进清单（document_member 无 deletedAt，拿它去清墓碑会抛 unknown column）', () => {
    const member = SYNC_TABLES.find((d) => d.table === 'document_member')!;
    expect(member.cols, 'document_member 居然有了 deletedAt＝判据需重审').not.toContain('deletedAt');
    expect(purgePlan().some((p) => p.model === 'DocumentMember')).toBe(false);
  });

  it('清单里的每一张都是同步表（拼错模型名＝那张表永远不清理且没人发现）', () => {
    const models = new Set(SYNC_TABLES.map((d) => d.model));
    for (const entry of purgePlan()) {
      expect(models.has(entry.model), `${entry.model} 不在 SYNC_TABLES`).toBe(true);
    }
  });
});
