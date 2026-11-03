import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../components/editor/slash-menu/slash-commands.ts', import.meta.url),
  'utf8',
);

/**
 * G1615：官方「列表」组逐字五项、按此序，首项 Enter 落 `numbered`；
 * 「全部展开/收起」不属于该组（官方名册里没有）。
 */
describe('the slash-menu list group (G1615)', () => {
  const listSection = source.slice(
    source.indexOf('// ── 列表 ──'),
    source.indexOf('// ── 折叠操作'),
  );

  it('lists the official five names in order', () => {
    const names = [...listSection.matchAll(/name: '([^']+)'/g)].map((match) => match[1]);
    expect(names).toEqual(['编号列表', '待办列表', '取消列表格式', '无序列表', '折叠列表']);
  });

  it('puts the ordered list first, so Enter lands on numbered', () => {
    expect(listSection.indexOf("name: '编号列表'")).toBeLessThan(
      listSection.indexOf("name: '无序列表'"),
    );
    expect(listSection).toContain('toggleOrderedList()');
  });

  it('carries a cancel-list-format command', () => {
    expect(listSection).toContain("name: '取消列表格式'");
    expect(listSection).toContain("liftListItem('listItem')");
    expect(listSection).toContain("toggleTaskList()");
  });

  it('keeps expand/collapse-all out of the list group', () => {
    const expand = source.slice(source.indexOf("name: '全部展开'"));
    expect(expand).toContain("category: '折叠操作'");
  });
});
