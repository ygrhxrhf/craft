import { describe, expect, it } from 'vitest';
import { filterCommands, type PaletteCommand } from './registry';

const commands: PaletteCommand[] = [
  { id: 'insert.table', title: '表格', group: '插入', keywords: ['table', '表格'], run: () => {} },
  { id: 'insert.mermaid', title: 'Mermaid 图表', group: '插入', keywords: ['mermaid', 'diagram'], run: () => {} },
];

describe('command registry search (G33)', () => {
  it('matches the title, group and keywords case-insensitively', () => {
    expect(filterCommands(commands, '表格').map((c) => c.id)).toEqual(['insert.table']);
    expect(filterCommands(commands, 'MERMAID').map((c) => c.id)).toEqual(['insert.mermaid']);
    expect(filterCommands(commands, '插入')).toHaveLength(2);
  });

  it('returns nothing for an empty or unmatched query', () => {
    expect(filterCommands(commands, '   ')).toEqual([]);
    expect(filterCommands(commands, '不存在')).toEqual([]);
  });
});
