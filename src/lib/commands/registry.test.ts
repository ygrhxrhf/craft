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

import { commandEnabled, mergePaletteCommands } from './registry';

describe('command availability', () => {
  it('greys out a command that has no handler at all', () => {
    expect(commandEnabled({ id: 'x', title: 'x', group: 'g', keywords: [] })).toBe(false);
  });

  it('honours the context gate when one is given', () => {
    let ready = false;
    const command = { id: 'x', title: 'x', group: 'g', keywords: [], run: () => {}, available: () => ready };
    expect(commandEnabled(command)).toBe(false);
    ready = true;
    expect(commandEnabled(command)).toBe(true);
  });
});

describe('merging implemented commands with the official roster (G33)', () => {
  const official = [
    { id: 'commands.a', title: 'A', group: 'a' },
    { id: 'commands.a.alias', title: 'A alias', group: 'a' },
    { id: 'commands.b', title: 'B', group: 'b' },
  ];

  it('drops the grey row for every id an implemented command claims', () => {
    const merged = mergePaletteCommands(
      [{ id: 'commands.a', title: '甲', group: '编辑', keywords: [], run: () => {}, aliases: ['commands.a.alias'] }],
      official,
    );
    expect(merged.map((command) => command.id)).toEqual(['commands.a', 'commands.b']);
    expect(merged.find((command) => command.id === 'commands.b')?.run).toBeUndefined();
  });

  it('keeps every unwired official id as a greyed placeholder', () => {
    const merged = mergePaletteCommands([], official);
    expect(merged).toHaveLength(3);
    expect(merged.every((command) => command.run === undefined)).toBe(true);
  });
});
