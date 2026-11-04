import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { applyFilter, evaluateOperator, operatorsFor } from './filter-operators';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/**
 * G173 的后半：**标签可直接进集合筛选**（include/exclude tag in filter）。
 * 标签是虚拟列（值来自条目所指向文档的标签名），操作符走 select 那一档。
 */
describe('tags as a filterable column (G173)', () => {
  it('offers the select operator tier', () => {
    expect(operatorsFor('tags')).toContain('select_isAnyOf');
    expect(operatorsFor('tags')).toContain('select_isNoneOf');
    expect(operatorsFor('tags')).toContain('isEmpty');
  });

  it('matches row tags by name (include)', () => {
    const row = ['项目/设计', '进行中'];
    expect(applyFilter({ propertyId: 'x', operator: 'select_isAnyOf', value: '项目/设计' }, row, 'tags')).toBe(true);
    expect(applyFilter({ propertyId: 'x', operator: 'select_isAnyOf', value: '归档' }, row, 'tags')).toBe(false);
  });

  it('excludes by name, and an untagged row counts as "none"', () => {
    const row = ['项目/设计'];
    expect(applyFilter({ propertyId: 'x', operator: 'select_isNoneOf', value: '归档' }, row, 'tags')).toBe(true);
    expect(applyFilter({ propertyId: 'x', operator: 'select_isNoneOf', value: '项目/设计' }, row, 'tags')).toBe(false);
    // 空数组＝没有标签；与官方"无"同义。
    expect(evaluateOperator('select_isNoneOf', [], '归档', 'tags')).toBe(true);
  });

  it('reads the virtual column off the row instead of collection_value', () => {
    const bar = read('src/components/collection/FilterBar.tsx');
    expect(bar).toContain("export const TAG_FILTER_PROPERTY_ID = '__tags__'");
    expect(bar).toContain("return applyFilter(filter, item.itemTags ?? [], 'tags');");
    // 下拉里能选到它。
    expect(bar).toContain('selectableProperties.map');
    expect(bar).toContain("name: '标签'");
  });

  it('attaches the document tags to each collection item on the server', () => {
    const action = read('src/actions/collection/collection.ts');
    expect(action).toContain('itemTags:');
    expect(action).toContain('DocumentTag');
  });
});
