export interface Cursor { ts: string; id: string }

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function formatCursor(c: Cursor): string {
  return `${c.ts}|${c.id}`;
}

export function parseCursor(s: string | null): Cursor | null {
  if (!s) return null;
  const i = s.indexOf('|');
  if (i <= 0 || i === s.length - 1) return null;
  const ts = s.slice(0, i);
  if (!ISO.test(ts)) return null;
  return { ts, id: s.slice(i + 1) };
}

// SQL 谓词用的排他下界：行需满足 (tsCol > ts) OR (tsCol = ts AND id > id)
export function afterCursor(c: Cursor): { ts: string; id: string } {
  return { ts: c.ts, id: c.id };
}

export function cmpCursor(a: Cursor, b: Cursor): number {
  if (a.ts !== b.ts) return a.ts < b.ts ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}
