import { describe, expect, it } from 'vitest';
import { compareFolderOrder } from './order';

const f = (id: string, order: number, createdAt?: string | null) => ({ id, order, createdAt });

describe('compareFolderOrder', () => {
  it('order 优先：数值小的在前', () => {
    const rows = [f('b', 2), f('a', 0), f('c', 1)].sort(compareFolderOrder);
    expect(rows.map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('order 并列时按 createdAt，再按 id —— 与数据库堆序无关', () => {
    const rows = [f('z', 0, '2026-01-02'), f('y', 0, '2026-01-01'), f('x', 0, '2026-01-02')];
    expect(rows.sort(compareFolderOrder).map((r) => r.id)).toEqual(['y', 'x', 'z']);
  });

  it('缺 createdAt 的旧行排在有时刻的行之前（空串最小），不是随机位', () => {
    const rows = [f('has', 0, '2026-01-01'), f('none', 0, null)];
    expect(rows.sort(compareFolderOrder).map((r) => r.id)).toEqual(['none', 'has']);
  });

  it('改名不改排序位：name 不在排序键里', () => {
    const rows = [f('a', 0, '2026-01-01'), f('b', 0, '2026-01-02'), f('c', 0, '2026-01-03')];
    expect(rows.map((r) => r.id)).toEqual([...rows].sort(compareFolderOrder).map((r) => r.id));
  });
});
