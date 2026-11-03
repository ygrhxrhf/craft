import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { KEY_BINDINGS } from './keymap';
import { BINDING_SECTIONS, PANEL_TABS } from './shortcut-panel';

const source = readFileSync(new URL('./keymap.ts', import.meta.url), 'utf8');

/** G1622：面板「在表格中」组首四条逐字。 */
describe('the shortcuts panel table group (G1622)', () => {
  it('names the seven categories in the collected order', () => {
    expect(PANEL_TABS.map((tab) => tab.label)).toEqual([
      '通用',
      '文档',
      '任务',
      '编辑',
      '样式',
      '整理',
      '合集',
    ]);
  });

  it('carries the four table rules under 合集 → 在表格中', () => {
    const expected: Array<[string, string]> = [
      ['TABLE_CLEAR_CELL', '清除单元格内容'],
      ['TABLE_ROW_BEFORE', '在前面添加行'],
      ['TABLE_ROW_AFTER', '添加行'],
      ['TABLE_COLUMN_BEFORE', '在前面添加列'],
    ];
    for (const [id, label] of expected) {
      const binding = KEY_BINDINGS.find((entry) => entry.id === id);
      expect(binding?.label, id).toBe(label);
      expect(BINDING_SECTIONS[id], id).toBe('collections-tables');
    }
    expect(source).toContain("group: 'tables'");
  });

  it('prints Ctrl-shift Enter and Ctrl-alt Enter distinctly', () => {
    expect(source).toContain("win: chord({ ctrlKey: true, shiftKey: true }, 'Enter', 'Enter')");
    expect(source).toContain("win: chord({ ctrlKey: true, altKey: true }, 'Enter', 'Enter')");
    expect(source).toContain("win: chord({ ctrlKey: true }, 'Enter', 'Enter')");
  });
});
