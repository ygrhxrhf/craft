// src/lib/sync/payload-shape.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SYNC_TABLES } from './tables';
import { columnShapes, invalidPayloadColumns } from './payload-shape';

/**
 * `gap.md` G1629 —— 值类型闸的判据面。两条都得钉：
 * ① **推导不漏**：同步表 `cols` 里的每一列都能在契约里拿到 kind（否则那一列的坏值会被
 *    `bindable` 的 `default: true` 放过去，闸变成装饰）；
 * ② **判定不松也不紧**：bool／int／float／timestamp 的坏值要拒，合法值（含 null 落在可空列）
 *    一律放行——误拒一枚正常 patch 的代价与放过去一枚坏 patch 一样大。
 */
const CONTRACT = join(process.cwd(), 'src', 'prisma', 'contract.json');
const contract = JSON.parse(readFileSync(CONTRACT, 'utf8'));

interface ModelShape {
  fields: Record<string, { type: { kind: string; codecId?: string } }>;
  storage: { table: string };
}
const models = contract.domain.namespaces.public.models as Record<string, ModelShape>;
const tables = contract.storage.namespaces.public.entries.table as Record<
  string, { columns: Record<string, { nullable: boolean }> }
>;

/** int4 上界 +1：Postgres 的整数溢出同样是语句失败 ⇒ 整批 25P02。 */
const INT4_OVER = 2147483648;

describe('G1629：同步 payload 按契约 codec 校验值类型', () => {
  it('同步表每一列都拿得到 kind（未登记的 codec 会在这里先红，而不是等败值溜过去）', () => {
    const unmapped: string[] = [];
    let checked = 0;
    for (const def of SYNC_TABLES) {
      const byCol = columnShapes(def.table);
      for (const col of def.cols) {
        const shape = byCol.get(col);
        if (!shape) { unmapped.push(`${def.table}.${col} 不在契约里`); continue; }
        checked += 1;
        if (shape.kind === null) {
          const codec = models[def.model]!.fields[col]?.type.codecId;
          unmapped.push(`${def.table}.${col} 的 codec ${codec} 没登记成 kind`);
        }
      }
    }
    expect(checked, '一列都没核对＝判据失效').toBeGreaterThan(150);
    expect(unmapped, unmapped.join('\n')).toEqual([]);
  });

  it('非空列拒绝 null（那是 NOT NULL 违例，会打崩整批）', () => {
    expect(invalidPayloadColumns('document', { title: null })).toEqual(['title']);
    expect(invalidPayloadColumns('document', { isDeleted: null })).toEqual(['isDeleted']);
    // 可空列收 null（deletedAt 的恢复、parentId 的清空都是正常笔）
    expect(invalidPayloadColumns('document', { deletedAt: null, parentId: null, folderId: null })).toEqual([]);
  });

  it('bool / int / float / timestamp 各拒一类坏值，且不牵连同一笔里的好值', () => {
    expect(invalidPayloadColumns('whiteboard', { isDeleted: 'yes' })).toEqual(['isDeleted']);
    expect(invalidPayloadColumns('collection_property', { order: 1.5, isVisible: true })).toEqual(['order']);
    expect(invalidPayloadColumns('collection_share' as string, {})).toEqual([]); // 未注册表：不发明规则
    expect(invalidPayloadColumns('tag', { order: '3a', pinned: false })).toEqual(['order']);
    expect(invalidPayloadColumns('task', { dueDate: 'tomorrow-ish' })).toEqual(['dueDate']);
    expect(invalidPayloadColumns('task', { dueDate: '2026-11-15T00:00:00.000Z' })).toEqual([]);
    // int4 上界：shareVersion 超过 2^31-1 是 Postgres 溢出，不是"很大的数字"
    expect(invalidPayloadColumns('document_share', { shareVersion: INT4_OVER })).toEqual(['shareVersion']);
    expect(invalidPayloadColumns('document_share', { shareVersion: 2 })).toEqual([]);
    // float8 不接 NaN/Infinity（JSON 里不存在，但 POST 直连时手工构造得出）
    expect(invalidPayloadColumns('favorite', { order: Number.POSITIVE_INFINITY })).toEqual(['order']);
  });

  it('text / json 收得宽：字符串与任意 JSON 值都放行，数字进 text 则拒', () => {
    expect(invalidPayloadColumns('document', { title: 123 })).toEqual(['title']);
    expect(invalidPayloadColumns('collection_item', { schemas: ['c1'], order: 1 })).toEqual([]);
    expect(invalidPayloadColumns('collection_value', { value: { rich: [1, 2] } })).toEqual([]);
    expect(invalidPayloadColumns('user', { prompts: [{ id: 'p' }], theme: 'dark' })).toEqual([]);
  });

  it('白名单外的键不判（它们会被 cols 求交丢掉，判了只是噪声）', () => {
    expect(invalidPayloadColumns('document', { content: 42, bogus: { x: 1 } })).toEqual([]);
  });

  it('☆ 每一列的 nullable 都以契约现读为准（两支锚：document.title 非空、document.parentId 可空）', () => {
    expect(columnShapes('document').get('title')!.nullable).toBe(false);
    expect(columnShapes('document').get('parentId')!.nullable).toBe(true);
    // 与 contract 原文逐列对照同一个字段，防"缓存/模型名映射错位"这类静默偏移
    const docModel = models.Document!;
    const docCols = tables[docModel.storage.table]!.columns;
    expect(columnShapes('document').get('title')!.nullable).toBe(docCols.title!.nullable);
    expect(columnShapes('document').get('parentId')!.nullable).toBe(docCols.parentId!.nullable);
  });
});
