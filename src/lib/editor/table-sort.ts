/**
 * Comparing two cells for a table sort (`table.sort.asc` / `table.sort.desc`). Two numbers compare
 * numerically, so "10" comes after "2"; anything else compares as text. A missing cell sorts as empty.
 */
export function compareCells(left: string | undefined, right: string | undefined, dir: 'asc' | 'desc'): number {
  const a = left ?? '';
  const b = right ?? '';
  const na = parseFloat(a);
  const nb = parseFloat(b);
  const numeric = a.trim() !== '' && b.trim() !== '' && !Number.isNaN(na) && !Number.isNaN(nb);
  const cmp = numeric ? na - nb : a.localeCompare(b, 'zh-CN');
  return dir === 'asc' ? cmp : -cmp;
}
