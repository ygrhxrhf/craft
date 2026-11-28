export type RowBox = { top: number; bottom: number };
export type DropTarget = { index: number; before: boolean };

/** A row that may be folded away (G280): the drag layer only ever lands on visible rows. */
export type MaybeVisibleRow = RowBox & { visible?: boolean };

/**
 * The rows a drop can land between — hidden (folded) rows are skipped, which is the local form of
 * the official `*Visible` addressing pair (`drop-address.ts`). A folded block's children are nested
 * inside it in the document, so they never appear as siblings here; filtering by the flag keeps
 * that intent explicit for callers that do carry hidden rows.
 */
export function visibleRows<T extends MaybeVisibleRow>(rows: T[]): T[] {
  return rows.filter((row) => row.visible !== false);
}

/**
 * Rows are hit as `[top, nextTop)` — the gutter under a row belongs to it — and a
 * drop above the first row clamps to the front, while one below the last row's
 * trailing gutter has no slot at all.
 */
export function dropTargetFor(clientY: number, rows: RowBox[]): DropTarget | null {
  if (rows.length === 0) return null;
  if (clientY < rows[0].top) return { index: 0, before: true };

  const last = rows[rows.length - 1];
  const pitch = rows.length > 1 ? rows[1].top - rows[0].top : last.bottom - last.top;
  const trailingGutter = Math.max(0, pitch - (last.bottom - last.top));

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const bandEnd = index + 1 < rows.length ? rows[index + 1].top : row.bottom + trailingGutter;
    if (clientY >= bandEnd) continue;
    return { index, before: clientY <= row.top + (row.bottom - row.top) / 2 };
  }

  return null;
}

/**
 * G270 —— 三种情况要**主动不画指示线**：悬在被拖块自身上、落点落在被拖组内部、以及紧贴
 * 组首／组尾的那两格（`before(first)` 与 `after(last)` 落地都是原地不动）。
 *
 * 判据收敛成一句：落点锚在 `[first, last]` 区间内就抑制——`before(first)` 与 `after(last)`
 * 正是组外相邻的两格，它们与组内所有格一样都产生"位置没变"。`before` 因此不参与判定；
 * 留它在签名里是为了让调用点读起来仍是"这一格画不画"。
 */
export function suppressesIndicator(
  dragged: readonly number[],
  anchor: number,
  _before: boolean,
): boolean {
  if (dragged.length === 0) return false;
  const first = Math.min(...dragged);
  const last = Math.max(...dragged);
  return anchor >= first && anchor <= last;
}
