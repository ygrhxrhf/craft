// src/lib/sync/references.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SYNC_TABLES } from './tables';
import { danglingReferences, createExistenceCache, orderByReferences, syncReferences } from './references';

/**
 * `gap.md` G1639 —— 同步载荷里的**外键悬空**。Postgres 对每个 N:1 关系都有真外键，而载荷里的
 * 引用列此前只被判过归属、没判过"被引用的那一行还在不在"。一台设备永久删除文档、另一台离线
 * 收藏它 ⇒ 重连那笔撞 FK 违例 ⇒ 事务 aborted（25P02）⇒ 整批 500 ⇒ 无限重推（G1625 家族）。
 * 这道闸从 `contract.json` 现读 N:1 关系，逐表核对"载荷能写的外键列都在册"。
 */
const CONTRACT = join(process.cwd(), 'src', 'prisma', 'contract.json');

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

const contract = JSON.parse(readFileSync(CONTRACT, 'utf8')) as ContractShape;
const models = contract.domain.namespaces.public.models;
const tables = contract.storage.namespaces.public.entries.table;

/** 契约里这张同步表"载荷能写"的 N:1 外键列（`User` 目标按实现排除，理由见模块注释）。 */
function contractRefs(table: string): { field: string; model: string; nullable: boolean }[] {
  const def = SYNC_TABLES.find((d) => d.table === table);
  if (!def) throw new Error(`${table} 不在 SYNC_TABLES`);
  const model = models[def.model];
  if (!model) throw new Error(`contract 里没有模型 ${def.model}`);
  const columns = tables[model.storage.table]?.columns ?? {};
  const out: { field: string; model: string; nullable: boolean }[] = [];
  for (const rel of Object.values(model.relations ?? {})) {
    if (rel.cardinality !== 'N:1') continue;
    const local = rel.on?.localFields ?? [];
    if (local.length !== 1) continue;
    const field = local[0]!;
    if (!def.cols.includes(field)) continue;
    const target = rel.to?.model ?? '';
    if (target === 'User') continue;
    out.push({ field, model: target, nullable: columns[field]?.nullable !== false });
  }
  return out;
}

describe('G1639：外键悬空闸的声明面（从契约现读）', () => {
  it('每张同步表载荷可写的 N:1 外键都在册，且列/目标/可空性逐项对得上', () => {
    const plan = syncReferences();
    const missing: string[] = [];
    for (const def of SYNC_TABLES) {
      const expected = contractRefs(def.table);
      const actual = plan.get(def.table) ?? [];
      for (const ref of expected) {
        const hit = actual.find((row) => row.field === ref.field);
        if (!hit) {
          missing.push(`${def.table}.${ref.field} → ${ref.model} 没进 references.ts`);
          continue;
        }
        expect(hit.model, `${def.table}.${ref.field} 目标模型写错`).toBe(ref.model);
        expect(hit.nullable, `${def.table}.${ref.field} 的可空性写错（决定悬空时置空还是拒收）`).toBe(ref.nullable);
      }
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('反向：名册里的每一枚引用都真在契约里（写错列名的条目是静默失效的闸）', () => {
    for (const [table, refs] of syncReferences()) {
      const expected = new Set(contractRefs(table).map((ref) => ref.field));
      for (const ref of refs) {
        expect(expected.has(ref.field), `${table}.${ref.field} 契约里没有这条 N:1 关系`).toBe(true);
      }
    }
  });

  it('关键档位锚住：favorite.documentId 非空（悬空必拒）、document.folderId 可空（悬空置 null）', () => {
    const favorite = syncReferences().get('favorite') ?? [];
    expect(favorite.find((ref) => ref.field === 'documentId')).toMatchObject({ model: 'Document', nullable: false });
    const document = syncReferences().get('document') ?? [];
    expect(document.find((ref) => ref.field === 'folderId')).toMatchObject({ model: 'Folder', nullable: true });
    expect(document.find((ref) => ref.field === 'parentId')).toMatchObject({ model: 'Document', nullable: true });
  });

  it('User 目标不判（账号行由会话保证；判它只会给每一笔带 userId 的写多一次读）', () => {
    for (const refs of syncReferences().values()) {
      for (const ref of refs) expect(ref.model).not.toBe('User');
    }
  });
});

describe('G1639：悬空判据', () => {
  /** 只有 `Document`/`Folder`/`Tag` 三张表有数据的最小 scope。 */
  function scopeWith(existing: Record<string, string[]>) {
    const make = (ids: string[] = []) => ({
      first: async (where: Record<string, unknown>) =>
        ids.includes(String(where.id)) ? { id: where.id } : null,
    });
    return {
      orm: {
        public: {
          Document: make(existing.Document),
          Folder: make(existing.Folder),
          Tag: make(existing.Tag),
          CommentThread: make(existing.CommentThread),
          Collection: make(existing.Collection),
          CollectionItem: make(existing.CollectionItem),
          CollectionProperty: make(existing.CollectionProperty),
        },
      },
    };
  }

  it('引用不存在的行 ⇒ 报那一枚列（可空/非空都报，由调用方分档）', async () => {
    const scope = scopeWith({ Document: ['d-exists'] });
    const refs = await danglingReferences(
      scope, 'favorite', { documentId: 'd-gone' }, createExistenceCache(),
    );
    expect(refs).toEqual([expect.objectContaining({ field: 'documentId', nullable: false })]);
  });

  it('引用存在的行 ⇒ 空数组', async () => {
    const scope = scopeWith({ Document: ['d-exists'] });
    expect(await danglingReferences(
      scope, 'favorite', { documentId: 'd-exists' }, createExistenceCache(),
    )).toEqual([]);
  });

  it('null／缺列不判（清空引用是合法动作）', async () => {
    const scope = scopeWith({});
    expect(await danglingReferences(scope, 'document', { folderId: null }, createExistenceCache())).toEqual([]);
    expect(await danglingReferences(scope, 'document', { title: 'x' }, createExistenceCache())).toEqual([]);
  });

  it('空串按悬空处理（Postgres 会拿它去查外键，那一笔同样必炸）', async () => {
    const scope = scopeWith({});
    expect(await danglingReferences(scope, 'favorite', { documentId: '' }, createExistenceCache()))
      .toEqual([expect.objectContaining({ field: 'documentId' })]);
  });

  it('非字符串值交给值类型闸，这里不判', async () => {
    const scope = scopeWith({});
    expect(await danglingReferences(scope, 'favorite', { documentId: 42 as unknown as string }, createExistenceCache()))
      .toEqual([]);
  });

  it('同一批里重复引用只读一次（读放大是这批的主要成本）', async () => {
    const calls: string[] = [];
    const scope = { orm: { public: { Document: { first: async (where: any) => { calls.push(String(where.id)); return { id: where.id }; } } } } };
    const cache = createExistenceCache();
    await danglingReferences(scope, 'favorite', { documentId: 'd1' }, cache);
    await danglingReferences(scope, 'favorite', { documentId: 'd1' }, cache);
    expect(calls).toEqual(['d1']);
  });

  it('本批刚落库的父行不必回读（minted）', async () => {
    const scope = scopeWith({});
    const refs = await danglingReferences(
      scope, 'favorite', { documentId: 'd-new' }, createExistenceCache(), new Set(['Document::d-new']),
    );
    expect(refs).toEqual([]);
  });
});

describe('G1639：批内引用排序', () => {
  const rec = (table: string, id: string, data: Record<string, unknown> = {}) =>
    ({ table, id, op: 'upsert', data, syncTs: '2026-11-16T00:00:00.000Z' });

  it('子行在父行之前 ⇒ 父行被提到前面（顺序是 FK 的前提）', () => {
    const ordered = orderByReferences([
      rec('favorite', 'f1', { documentId: 'd1' }),
      rec('document', 'd1', { title: 'x' }),
    ]);
    expect(ordered.map((r: any) => `${r.table}:${r.id}`)).toEqual(['document:d1', 'favorite:f1']);
  });

  it('已经正确的顺序不动（稳定）', () => {
    const input = [rec('document', 'd1', { title: 'x' }), rec('favorite', 'f1', { documentId: 'd1' })];
    expect(orderByReferences(input).map((r: any) => r.id)).toEqual(['d1', 'f1']);
  });

  it('批外依赖不触发移动（父行已在库）', () => {
    const input = [rec('favorite', 'f1', { documentId: 'already-in-db' }), rec('document', 'd1', { title: 'x' })];
    expect(orderByReferences(input).map((r: any) => r.id)).toEqual(['f1', 'd1']);
  });

  it('delete 不提供行（引用墓碑的笔仍按悬空判，不给它排序豁免）', () => {
    const input = [
      { table: 'favorite', id: 'f1', op: 'upsert', data: { documentId: 'd1' }, syncTs: 'x' },
      { table: 'document', id: 'd1', op: 'delete', syncTs: 'x' },
    ];
    expect(orderByReferences(input).map((r: any) => r.id)).toEqual(['f1', 'd1']);
  });

  it('成环时按原序收尾，不丢笔（残余悬空交给闸逐笔拒）', () => {
    const input = [
      rec('document', 'a', { parentId: 'b' }),
      rec('document', 'b', { parentId: 'a' }),
    ];
    const out = orderByReferences(input);
    expect(out).toHaveLength(2);
    expect(new Set(out.map((r: any) => r.id))).toEqual(new Set(['a', 'b']));
  });

  it('多层链：孙 → 子 → 父 全部按引用顺序展开', () => {
    const input = [
      rec('document', 'child', { parentId: 'root' }),
      rec('document', 'grandchild', { parentId: 'child' }),
      rec('document', 'root', { title: 'root' }),
    ];
    const ids = orderByReferences(input).map((r: any) => r.id);
    expect(ids.indexOf('root')).toBeLessThan(ids.indexOf('child'));
    expect(ids.indexOf('child')).toBeLessThan(ids.indexOf('grandchild'));
  });
});
