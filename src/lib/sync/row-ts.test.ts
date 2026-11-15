import { describe, expect, it } from 'vitest';
import { effectiveRowTs } from './row-ts';

/**
 * `gap.md` G1637 —— `document` / `whiteboard` 的同步时刻列是 `metaUpdatedAt`，而它**可空、
 * 无 DB 默认**（`updatedAt` 才有生成器）。历史行这一列可能是 NULL 或坏值：
 *  - 旧 GET 侧 `if (!syncTsRaw) continue` ⇒ 整行从增量流里静默消失；
 *  - `new Date(坏串).toISOString()` ⇒ 抛 "Invalid time value"，整次 pull 500。
 * 这里逐条钉住"取不到就退回 updatedAt、两列都不行才 null"。
 */
describe('G1637：行同步时刻的可空列兜底', () => {
  it('tsCol 有值 ⇒ 用它', () => {
    expect(effectiveRowTs(
      { metaUpdatedAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T09:00:00.000Z' },
      'metaUpdatedAt',
    )).toBe('2026-11-01T10:00:00.000Z');
  });

  it('tsCol 是 NULL ⇒ 退回 updatedAt（历史行因此照样进增量流）', () => {
    expect(effectiveRowTs(
      { metaUpdatedAt: null, updatedAt: '2026-11-01T09:00:00.000Z' },
      'metaUpdatedAt',
    )).toBe('2026-11-01T09:00:00.000Z');
  });

  it('tsCol 是坏字符串 ⇒ 退回 updatedAt，不抛错（整次 pull 不再 500）', () => {
    expect(effectiveRowTs(
      { metaUpdatedAt: 'not-a-date', updatedAt: '2026-11-01T09:00:00.000Z' },
      'metaUpdatedAt',
    )).toBe('2026-11-01T09:00:00.000Z');
  });

  it('tsCol 是空串 ⇒ 退回 updatedAt', () => {
    expect(effectiveRowTs(
      { metaUpdatedAt: '', updatedAt: '2026-11-01T09:00:00.000Z' },
      'metaUpdatedAt',
    )).toBe('2026-11-01T09:00:00.000Z');
  });

  it('两列都不可用 ⇒ null（调用方跳过这一行，而不是拿 1970 参与 LWW）', () => {
    expect(effectiveRowTs({ metaUpdatedAt: null, updatedAt: null }, 'metaUpdatedAt')).toBeNull();
    expect(effectiveRowTs({}, 'metaUpdatedAt')).toBeNull();
    expect(effectiveRowTs(null, 'metaUpdatedAt')).toBeNull();
  });

  it('tsCol 本身就是 updatedAt 时不看别的列', () => {
    expect(effectiveRowTs({ updatedAt: '2026-11-01T09:00:00.000Z', createdAt: '2026-11-01T08:00:00.000Z' }, 'updatedAt'))
      .toBe('2026-11-01T09:00:00.000Z');
  });

  it('Date 对象也认（ORM 某些驱动把 timestamptz 还给 Date）', () => {
    expect(effectiveRowTs({ metaUpdatedAt: new Date('2026-11-01T10:00:00.000Z') }, 'metaUpdatedAt'))
      .toBe('2026-11-01T10:00:00.000Z');
  });
});
