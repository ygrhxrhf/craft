/**
 * G439 —— 表格单元格有**稳定 id**，可被深链与公式单独寻址（`model.md` §一之十二 2）。
 *
 * 官方那个 `VLe` 逐字段解析出 `{id, rowId, columnId, blockId}` ⇒ **单元格正文就是一块普通块**，
 * 且每个 cell 有跨持久层的稳定 id。本地 cell 是内联 `paragraph`，没有稳定 id，既不能被深链、
 * 也不能被公式单独寻址（可锚定块只有 paragraph/heading，见 `search/anchors.ts`）。
 *
 * 本模块给出单元格地址的三段形状与深链的生成/解析——它是"可寻址性"这一格的最小实现，
 * 让"单元格能不能被单独指到"这件事能被单测钉住，而不必先改存储。
 */

/** 一个单元格的稳定地址：行 id、列 id、单元格 id 三者齐备。 */
export interface CellAddress {
  /** 表格块自己的 id。 */
  tableId: string;
  rowId: string;
  columnId: string;
  cellId: string;
}

/** 深链的 hash 前缀（与 `block-anchor.ts` 的 `b-` 同族，但寻址粒度到格）。 */
export const CELL_HASH_PREFIX = 'c-';

/** 三段之间用 `__` 分隔（与 `document_tag` 的复合键同规，避免与 uuid 里的 `-` 撞）。 */
const SEPARATOR = '__';

/**
 * 单元格深链：`/documents/<docId>#c-<tableId>__<rowId>__<columnId>__<cellId>`。
 * 四段缺一不可——少了 row/column 就退回"表格块"这一档，那正是本行要修掉的粗粒度。
 */
export function cellHref(documentId: string, address: CellAddress): string {
  const base = `/documents/${documentId}`;
  const body = [address.tableId, address.rowId, address.columnId, address.cellId].join(SEPARATOR);
  return `${base}#${CELL_HASH_PREFIX}${body}`;
}

/** 解析单元格深链；不是单元格地址返回 `null`。 */
export function readCellHash(hash: string | undefined | null): CellAddress | null {
  if (!hash?.startsWith('#')) return null;
  let raw = hash.slice(1);
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!raw.startsWith(CELL_HASH_PREFIX)) return null;
  const parts = raw.slice(CELL_HASH_PREFIX.length).split(SEPARATOR);
  if (parts.length !== 4 || parts.some((part) => !part)) return null;
  const [tableId, rowId, columnId, cellId] = parts;
  return { tableId, rowId, columnId, cellId };
}

/**
 * 公式的**方向性区域引用**指向的也是这些格（`table.formula.above/below/left/right.desc`）：
 * 给定一个格的地址与表格的格子矩阵，取它上/下/左/右的邻格 id。越界方向返回空数组
 * （与 `formula.ts` 的 `FormulaGrid` 同语义——没有邻域就不发明值）。
 */
export interface CellMatrix {
  rows: string[][];
}

export function neighborCells(
  matrix: CellMatrix,
  address: { row: number; column: number },
): { above: string[]; below: string[]; left: string[]; right: string[] } {
  const { row, column } = address;
  const above: string[] = [];
  const below: string[] = [];
  for (let r = 0; r < matrix.rows.length; r += 1) {
    const cell = matrix.rows[r]?.[column];
    if (!cell) continue;
    if (r < row) above.push(cell);
    else if (r > row) below.push(cell);
  }
  const line = matrix.rows[row] ?? [];
  return {
    above,
    below,
    left: line.slice(0, column),
    right: line.slice(column + 1),
  };
}
