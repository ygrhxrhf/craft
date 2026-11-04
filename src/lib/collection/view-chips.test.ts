import { describe, expect, it } from 'vitest';

import { filterChipText, groupChipText, sortChipText, withTitleFirst } from './view-chips';

// G105: chip text templates for filter / sort / group, and the title-first field merge.
describe('collection view chips (G105)', () => {
  it('prints filter chips with and without a value segment', () => {
    expect(filterChipText('状态', '是', '进行中', true)).toBe('状态 是 进行中');
    expect(filterChipText('状态', '为空', null, false)).toBe('状态 为空');
    expect(filterChipText('标签', '包含', ['a', 'b'], true)).toBe('标签 包含 a, b');
  });

  it('prints sort direction arrows', () => {
    expect(sortChipText('名称', 'asc')).toBe('名称 ↑');
    expect(sortChipText('已更新', 'desc')).toBe('已更新 ↓');
  });

  it('prints the group chip', () => {
    expect(groupChipText('状态')).toBe('按 状态 分组');
  });

  it('keeps the first text property first', () => {
    const props = [
      { id: 'n', type: 'number', order: 0 },
      { id: 't', type: 'text', order: 1 },
      { id: 'd', type: 'date', order: 2 },
    ];
    expect(withTitleFirst(props).map((p) => p.id)).toEqual(['t', 'n', 'd']);
  });

  // G397：视图的 customPropertyOrder 必须活过这一层——它只该"把标题列挪到最前"，
  // 不能顺手按属性行的 order 重排（否则视图列序永远显示不出来，G81 的上/下移也是空转）。
  it('preserves an incoming order that differs from the property order', () => {
    const props = [
      { id: 't', type: 'text', order: 0 },
      { id: 'n', type: 'number', order: 2 },
      { id: 'd', type: 'date', order: 1 },
    ];
    expect(withTitleFirst(props).map((p) => p.id)).toEqual(['t', 'n', 'd']);
  });

  it('still pulls a title column that the view parked in the middle', () => {
    const props = [
      { id: 'd', type: 'date', order: 5 },
      { id: 't', type: 'text', order: 9 },
      { id: 'n', type: 'number', order: 1 },
    ];
    expect(withTitleFirst(props).map((p) => p.id)).toEqual(['t', 'd', 'n']);
  });
});
