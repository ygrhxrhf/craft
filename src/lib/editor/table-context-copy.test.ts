import { describe, expect, it } from 'vitest';
import { TABLE_CONTEXT_UNAVAILABLE, tableRedirectCopy } from './table-context-copy';

describe('table context menu copy (G34)', () => {
  it('uses the two collected sentences verbatim', () => {
    expect(TABLE_CONTEXT_UNAVAILABLE).toBe('这些操作无法通过上下文菜单执行。');
    expect(tableRedirectCopy('工具栏', '编辑表格')).toBe('请使用工具栏来编辑表格');
  });
});
