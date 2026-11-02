/**
 * G112 —— **CSV 文件块一键转集合**（`collections.md`／G112）。
 *
 * 官方那支的四个要点，逐条落成本模块：
 *   1. `isCsvFileBlock` **守卫**：只有 `name` 以 `.csv` 结尾的文件块才给这个入口；
 *   2. **集合名取文件名去扩展**（`报表.csv` → `报表`）；
 *   3. 正文走 **`proxyUrl` 代理**读（文件在对象存储里，前端直连会被 CORS 拦）——本仓的
 *      `/api/v1/files/...` 就是那个代理位；
 *   4. 埋点带 `state: "start"` 阶段（开始转换那一刻记一次）。
 *
 * 本模块只判"该不该给入口"与"叫什么"，IO 留给调用点。
 */

/** 文件块名是不是 CSV（大小写不敏感，允许 `.CSV`）。 */
export function isCsvFileBlock(name: string | null | undefined): boolean {
  if (typeof name !== 'string') return false;
  return /\.csv$/i.test(name.trim());
}

/**
 * 集合名＝文件名去扩展。`报表.csv` → `报表`；没有扩展就原样；空名给「未命名集合」
 * （与集合默认名一致，不发明第三种）。
 */
export function collectionNameFromFile(name: string | null | undefined): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return '未命名集合';
  const base = trimmed.replace(/\.[^./\\]+$/, '');
  return base || '未命名集合';
}

/**
 * 文件块正文该走哪条通路读：CSV 一律走**代理**（`proxyUrl`），不走浏览器直连。
 * 返回 null 表示这个块不该被转换（不是 CSV）。
 */
export function csvProxyUrlFor(name: string | null | undefined, src: string | null | undefined): string | null {
  if (!isCsvFileBlock(name)) return null;
  if (typeof src !== 'string' || !src) return null;
  return src;
}

/** 埋点的阶段名（官方那支带 `state: "start"`）。 */
export const CSV_TO_COLLECTION_EVENT = 'collection.import.csv';
export const CSV_TO_COLLECTION_START = 'start' as const;
export const CSV_TO_COLLECTION_DONE = 'success' as const;

export interface CsvImportEvent {
  event: string;
  state: typeof CSV_TO_COLLECTION_START | typeof CSV_TO_COLLECTION_DONE;
  rowCount?: number;
}

/** 开始那一刻的埋点。 */
export function csvImportStartEvent(): CsvImportEvent {
  return { event: CSV_TO_COLLECTION_EVENT, state: CSV_TO_COLLECTION_START };
}

/** 落成之后的埋点（带行数，便于看这次导入到底搬了多少行）。 */
export function csvImportDoneEvent(rowCount: number): CsvImportEvent {
  return { event: CSV_TO_COLLECTION_EVENT, state: CSV_TO_COLLECTION_DONE, rowCount };
}
