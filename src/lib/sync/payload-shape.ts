import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SYNC_TABLES } from '@/lib/sync/tables';

/**
 * `gap.md` G1629 —— 同步写路径的**值类型闸**。
 *
 * `recordSchema` 只约束 `data` 是 `Record<string, unknown>`，每一列的类型此前一律交给 Postgres：
 * 一枚 `{isDeleted: 'yes'}` 或 `{order: '3a'}` 会被参数化成非法的输入函数调用 ⇒ 语句报错 ⇒
 * 整个事务进 aborted 态（SQLSTATE `25P02`）⇒ 整批 500 ⇒ 客户端无限重推同一笔（G1625 家族的
 * 第四副面孔：前三副分别撞唯一键、缺必填列、撞作用域）。区别在于这条**永远不可能成功**，
 * 所以它必须被单独拒掉（`reason: 'invalid'`），让客户端丢掉这一笔、其余照常落地。
 *
 * 判据从 `src/prisma/contract.json` 现读（与 `getDb` 读的是同一份）：逐列拿 codec + nullable，
 * 不在这里手抄第二份类型表。未登记的 codec 一律放行——不是宽容，而是 `payload-shape.test.ts`
 * 现扫每张同步表的每一列，出现未登记 codec 时那边先红。
 */
type ColumnKind = 'text' | 'timestamp' | 'bool' | 'int' | 'float' | 'json';

interface ColumnShape {
  kind: ColumnKind | null; // null＝未登记的 codec（测试保证同步列里不存在）
  nullable: boolean;
}

interface ContractShape {
  domain: { namespaces: { public: { models: Record<string, {
    fields: Record<string, { type: { kind: string; codecId?: string } }>;
    storage: { table: string };
  }> } } };
  storage: { namespaces: { public: { entries: { table: Record<string, {
    columns: Record<string, { nullable: boolean }>;
  }> } } } };
}

function codecKind(codecId: string | undefined): ColumnKind | null {
  switch (codecId) {
    case 'pg/text@1': return 'text';
    case 'pg/timestamptz-string@1': return 'timestamp';
    case 'pg/bool@1': return 'bool';
    case 'pg/int4@1': return 'int';
    case 'pg/float8@1': return 'float';
    case 'pg/json@1': return 'json';
    default: return null;
  }
}

const INT4_MAX = 2147483647;

let shapes: Map<string, Map<string, ColumnShape>> | null = null;

function contractPath(): string {
  const proc = (globalThis as { process?: NodeJS.Process }).process;
  return join(proc!.cwd(), 'src', 'prisma', 'contract.json');
}

/** 一张同步表的列 → (kind, nullable)。首次调用读一次契约，之后用缓存（列形状是构建期常量）。 */
export function columnShapes(table: string): Map<string, ColumnShape> {
  if (!shapes) {
    const contract = JSON.parse(readFileSync(contractPath(), 'utf8')) as ContractShape;
    shapes = new Map();
    for (const def of SYNC_TABLES) {
      const model = contract.domain.namespaces.public.models[def.model];
      if (!model) continue;
      const columns = contract.storage.namespaces.public.entries.table[model.storage.table]?.columns;
      if (!columns) continue;
      const byCol = new Map<string, ColumnShape>();
      for (const col of def.cols) {
        const field = model.fields[col];
        const column = columns[col];
        if (!field || !column) continue;
        byCol.set(col, {
          kind: field.type.kind === 'scalar' ? codecKind(field.type.codecId) : null,
          nullable: column.nullable,
        });
      }
      shapes.set(def.table, byCol);
    }
  }
  return shapes.get(table) ?? new Map();
}

/** 一枚值能不能绑进这一列。`null` 单独判：非空列塞 null 同样是 Postgres 报错（同一条毒批次）。 */
function bindable(shape: ColumnShape, value: unknown): boolean {
  if (value === null) return shape.nullable;
  if (value === undefined) return true; // JSON 化之后不该出现；真出现就当没带这一列
  switch (shape.kind) {
    case 'text': return typeof value === 'string';
    case 'timestamp':
      return typeof value === 'string' && !Number.isNaN(Date.parse(value));
    case 'bool': return typeof value === 'boolean';
    case 'int': return typeof value === 'number' && Number.isInteger(value)
      && value >= -INT4_MAX - 1 && value <= INT4_MAX;
    case 'float': return typeof value === 'number' && Number.isFinite(value);
    case 'json': return true; // 任意 JSON 值
    default: return true;     // 未登记的 codec：放行（测试保证同步列里没有）
  }
}

/**
 * 这一笔 payload 里**绑不进列类型**的键。空数组＝这一笔可写。
 * 白名单外的键不在这里判（它们会被 `cols` 求交直接丢掉，判了也没有意义）。
 */
export function invalidPayloadColumns(table: string, data: Record<string, unknown> | undefined): string[] {
  if (!data) return [];
  const byCol = columnShapes(table);
  const bad: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const shape = byCol.get(key);
    if (!shape) continue;
    if (!bindable(shape, value)) bad.push(key);
  }
  return bad;
}
