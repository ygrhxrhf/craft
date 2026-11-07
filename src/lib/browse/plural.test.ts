import { describe, expect, it } from 'vitest';

import {
  changeAppliedLabel,
  collectionStatusLabel,
  deleteRowsLabel,
  filteredByLabel,
  groupedByLabel,
  hiddenFieldsLabel,
  moveColumnsLeftLabel,
  sortedByLabel,
} from './plural';

describe('the seven plural families (G291)', () => {
  it('filters take the one/x pair, not a template with a number', () => {
    expect(filteredByLabel(1)).toBe('按 1 个字段筛选');
    expect(filteredByLabel(0)).toBe('按 0 个字段筛选');
    expect(filteredByLabel(3)).toBe('按 3 个字段筛选');
  });

  it('sorts take the one/x pair', () => {
    expect(sortedByLabel(1)).toBe('按 1 个字段排序');
    expect(sortedByLabel(2)).toBe('按 2 个字段排序');
  });

  it('grouping takes the one/x pair', () => {
    expect(groupedByLabel(1)).toBe('按 1 个字段分组');
    expect(groupedByLabel(4)).toBe('按 4 个字段分组');
  });

  it('row deletion switches key, even though both Chinese lines read the same', () => {
    expect(deleteRowsLabel(1)).toBe('删除行');
    expect(deleteRowsLabel(2)).toBe('删除行');
  });

  it('column moves switch key the same way', () => {
    expect(moveColumnsLeftLabel(1)).toBe('向左移动列');
    expect(moveColumnsLeftLabel(3)).toBe('向左移动列');
  });

  it('applied-change lines keep the count in the slot', () => {
    expect(changeAppliedLabel(1)).toBe('已应用 1 项更改');
    expect(changeAppliedLabel(5)).toBe('已应用 5 项更改');
  });

  it('hidden fields read "1 个隐藏字段" for one, "[0] 隐藏字段" otherwise', () => {
    expect(hiddenFieldsLabel(1)).toBe('1 个隐藏字段');
    expect(hiddenFieldsLabel(2)).toBe('2 隐藏字段');
  });

  it('floors junk counts instead of emitting NaN', () => {
    expect(filteredByLabel(-2)).toBe('按 0 个字段筛选');
    expect(hiddenFieldsLabel(Number.NaN)).toBe('0 隐藏字段');
  });
});

describe('the collection status line joins only the active lanes', () => {
  it('is empty when nothing is applied', () => {
    expect(collectionStatusLabel({ filters: 0, sorts: 0, grouped: false })).toBe('');
  });

  it('joins filter, sort and group with a middle dot', () => {
    expect(collectionStatusLabel({ filters: 1, sorts: 2, grouped: true })).toBe(
      '按 1 个字段筛选 · 按 2 个字段排序 · 按 1 个字段分组',
    );
  });

  it('drops the lanes that are off', () => {
    expect(collectionStatusLabel({ filters: 0, sorts: 1, grouped: false })).toBe('按 1 个字段排序');
  });
});