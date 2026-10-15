/**
 * `gap.md` G290 —— **集合专属导出格式**：官方 `collections.download.as.csv`「下载为 CSV」
 * （`_harvest/i18n-zh.tsv:1073`）。它挂在**集合视图**上，不在文档侧导出菜单里。
 *
 * 这里只做纯序列化（RFC 4180 口径）：
 *   - 含 `"`、`,`、`\n`、`\r` 的单元格用双引号包起来，内部 `"` 双写；
 *   - 行尾 `\r\n`；
 *   - 表头＝属性名（按属性 order 排）。
 */

/** 一个单元格：任何值都转成字符串；null/undefined 记空串。 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // 多选/关系这类结构化值：JSON 会带引号，交给下面的转义处理。
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** 转义一个字段：需要时加引号并双写内部引号。 */
export function escapeCsvField(raw: string): string {
  if (/[",\r\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export interface CsvColumn {
  key: string;
  label: string;
}

export interface CsvRow {
  /** 按 `columns[].key` 取值。 */
  [key: string]: unknown;
}

/** 序列化整张表：表头 + 行，`\r\n` 结尾。 */
export function toCsv(columns: readonly CsvColumn[], rows: readonly CsvRow[]): string {
  const header = columns.map((c) => escapeCsvField(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCsvField(cell(row[c.key]))).join(','));
  return [header, ...body].join('\r\n') + '\r\n';
}

/** 从属性行造列（按调用方给的顺序＝属性 order）。 */
export function columnsFromProperties(
  properties: readonly { id: string; name: string }[],
): CsvColumn[] {
  return properties.map((p) => ({ key: p.id, label: p.name }));
}

/**
 * 把「一行条目 + 它的值数组」压成 CSV 行：值的 key 是属性 id。
 * 同属性多值（多选/关系）用 `; ` 连接，与集合单元格的显示一致。
 */
export function rowsFromItems(
  items: readonly { id: string; values: readonly { propertyId: string; value: unknown }[] }[],
): CsvRow[] {
  return items.map((item) => {
    const row: CsvRow = {};
    for (const v of item.values) {
      const key = v.propertyId;
      if (key in row) {
        row[key] = `${String(row[key])}; ${cell(v.value)}`;
      } else {
        row[key] = v.value;
      }
    }
    return row;
  });
}
