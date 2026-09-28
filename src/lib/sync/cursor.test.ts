import { describe, it, expect } from 'vitest';
import { formatCursor, parseCursor, cmpCursor } from './cursor';

describe('cursor', () => {
  it('格式化与解析互逆', () => {
    const s = '2026-09-28T10:03:00.123Z|abc-123';
    expect(formatCursor({ ts: '2026-09-28T10:03:00.123Z', id: 'abc-123' })).toBe(s);
    expect(parseCursor(s)).toEqual({ ts: '2026-09-28T10:03:00.123Z', id: 'abc-123' });
  });

  it('非法输入返回 null', () => {
    expect(parseCursor(null)).toBeNull();
    expect(parseCursor('')).toBeNull();
    expect(parseCursor('no-pipe')).toBeNull();
    expect(parseCursor('not-iso|id')).toBeNull();
  });

  it('同 ts 按 id 字典序比较', () => {
    const t = '2026-09-28T10:03:00.123Z';
    expect(cmpCursor({ ts: t, id: 'b' }, { ts: t, id: 'a' })).toBeGreaterThan(0);
    expect(cmpCursor({ ts: '2026-09-28T10:03:00.124Z', id: 'a' }, { ts: t, id: 'z' })).toBeGreaterThan(0);
    expect(cmpCursor({ ts: t, id: 'a' }, { ts: t, id: 'a' })).toBe(0);
  });
});
