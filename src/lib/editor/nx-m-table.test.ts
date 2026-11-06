import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { NXM_PATTERN, parseTableShortcut } from './nx-m-table';

/** G336：快捷面板的 `NxM` 生表格——正则、cols 缺省、抑制条件三件套。 */
describe('the NxM table shortcut (G336)', () => {
  it('reads the official pattern verbatim, case-insensitively', () => {
    // 官方是 `^(?<rows>\d+)x?(?<cols>\d*)$/i`；本地两处差异：target < ES2018 ⇒ 位置捕获组；
    // 分隔符收成 `[x×]`（Typography 的 multiplication 规则会把数字间的 `x` 换成 `×`）。
    expect(NXM_PATTERN.source).toBe('^(\\d+)[x×]?(\\d*)$');
    expect(NXM_PATTERN.flags).toContain('i');
    expect(parseTableShortcut('12x3')).toEqual({ rows: 12, cols: 3 });
    expect(parseTableShortcut('12X3')).toEqual({ rows: 12, cols: 3 });
  });

  it('still parses after the typography rule turned the x into a multiplication sign', () => {
    // 真打字的实测形态：屏上文本是 `/12×3`，候选要照常出。
    expect(parseTableShortcut('12×3')).toEqual({ rows: 12, cols: 3 });
    expect(parseTableShortcut('12×')).toEqual({ rows: 12, cols: 12 });
    expect(parseTableShortcut('12×12')).toEqual({ rows: 12, cols: 12 });
  });

  it('treats a missing cols as rows', () => {
    expect(parseTableShortcut('12')).toEqual({ rows: 12, cols: 12 });
    expect(parseTableShortcut('12x')).toEqual({ rows: 12, cols: 12 });
  });

  it('suppresses squares up to 9, but not bigger ones', () => {
    expect(parseTableShortcut('4x4')).toBeNull();
    expect(parseTableShortcut('9x9')).toBeNull();
    expect(parseTableShortcut('3')).toBeNull();
    expect(parseTableShortcut('10x10')).toEqual({ rows: 10, cols: 10 });
    expect(parseTableShortcut('10')).toEqual({ rows: 10, cols: 10 });
  });

  it('suppresses a zero on either side', () => {
    expect(parseTableShortcut('0')).toBeNull();
    expect(parseTableShortcut('0x5')).toBeNull();
    expect(parseTableShortcut('5x0')).toBeNull();
  });

  it('ignores anything that is not the shortcut shape', () => {
    expect(parseTableShortcut('')).toBeNull();
    expect(parseTableShortcut('表格')).toBeNull();
    expect(parseTableShortcut('abc')).toBeNull();
    expect(parseTableShortcut('12 x 3')).toBeNull();
    expect(parseTableShortcut('x3')).toBeNull();
  });

  it('keeps the result inside the table limits, so the shortcut cannot bypass them', () => {
    expect(parseTableShortcut('200x40')).toEqual({ rows: 50, cols: 15 });
    expect(parseTableShortcut('999')).toEqual({ rows: 50, cols: 15 });
    expect(parseTableShortcut('12x03')).toEqual({ rows: 12, cols: 3 });
  });
});

/**
 * 解析层对了没人用也只是死表 ⇒ 候选要真的从 `filterCommands` 出来，
 * 而这条通路的唯一消费方是斜杠菜单的建议插件。
 */
describe('the slash menu feeds the shortcut (G336)', () => {
  const commands = readFileSync(
    join(process.cwd(), 'src/components/editor/slash-menu/slash-commands.ts'),
    'utf8',
  );

  it('prepends a table candidate when the query parses', () => {
    expect(commands).toContain("import { parseTableShortcut, type TableShortcutSize } from '@/lib/editor/nx-m-table';");
    expect(commands).toContain('export function sizeShortcutCommand(query: string): SlashCommand | null');
    expect(commands).toContain('return size ? tableShortcutCommand(size) : null;');
  });

  it('builds the candidate with the parsed size and the shared table command', () => {
    expect(commands).toContain('insertTable({ rows: size.rows, cols: size.cols, withHeaderRow: true })');
    // 标签逐字照官方构造器 `H3(t,e)` 的 `label: \`${t}x${e}\``。
    expect(commands).toContain('name: `${size.rows}x${size.cols}`');
  });

  it('is consumed by the suggestion plugin, which is what the editor renders', () => {
    const extension = readFileSync(
      join(process.cwd(), 'src/components/editor/slash-menu/SlashCommandExtension.ts'),
      'utf8',
    );
    // 两段式之后候选由 `rowsFor` 组装：动态尺寸行（`size-shortcut`）走 `sizeShortcutCommand`。
    expect(extension).toContain('sizeShortcutCommand(query)');
    expect(extension).toContain("id: 'size-shortcut'");
    expect(extension).toContain('rowsFor(');
  });
});
