import { describe, expect, it } from 'vitest';

import { KEY_BINDINGS } from './keymap';
import { OFFICIAL_ROWS, OFFICIAL_WIRING, panelRoster } from './shortcut-official-rows';
import { PANEL_SECTIONS, PANEL_TABS, tabOfSection } from './shortcut-panel';

/** 第 82 批对账定版：分类行数 7/4/15/13/27/6/17＝89，键帽数 16/11/34/27/80/13/38＝219。 */
const TAB_ROWS = { general: 7, document: 4, tasks: 15, editing: 13, style: 27, organize: 6, collections: 17 };
const TAB_KEYS = { general: 16, document: 11, tasks: 34, editing: 27, style: 80, organize: 13, collections: 38 };

function keycapsOf(row: (typeof OFFICIAL_ROWS)[number]): number {
  return row.keys.length + (row.alt?.keys.length ?? 0);
}

describe('官方名册 89 行（G755 / G771）', () => {
  it('holds the seven tabs with the collected row counts', () => {
    for (const tab of PANEL_TABS) {
      const rows = OFFICIAL_ROWS.filter((row) => row.tab === tab.id);
      expect(rows.length, tab.id).toBe(TAB_ROWS[tab.id]);
    }
    expect(OFFICIAL_ROWS).toHaveLength(89);
  });

  it('counts the collected keycaps per tab (219 total)', () => {
    for (const tab of PANEL_TABS) {
      const caps = OFFICIAL_ROWS.filter((row) => row.tab === tab.id).reduce((sum, row) => sum + keycapsOf(row), 0);
      expect(caps, tab.id).toBe(TAB_KEYS[tab.id]);
    }
    const total = OFFICIAL_ROWS.reduce((sum, row) => sum + keycapsOf(row), 0);
    expect(total).toBe(219);
  });

  it('carries exactly the six alias rows (或者)', () => {
    const aliasRows = OFFICIAL_ROWS.filter((row) => row.alt);
    expect(aliasRows).toHaveLength(6);
    expect(aliasRows.map((row) => row.label)).toEqual([
      '快速开启',
      '将任务标记为已完成',
      '删除',
      '将任务标记为已完成',
      '代码',
      '添加一行',
    ]);
  });

  it('binds keymap rows only to ids that exist, and wiring rows only to known markers', () => {
    const ids = new Set(KEY_BINDINGS.map((binding) => binding.id));
    for (const row of OFFICIAL_ROWS) {
      for (const bound of [row.bound, row.alt?.bound]) {
        if (!bound) continue;
        if (OFFICIAL_WIRING.has(bound)) continue;
        expect(ids.has(bound), `${row.label} → ${bound}`).toBe(true);
      }
    }
  });

  it('places every section on an existing section id of the same tab', () => {
    const ids = new Set(PANEL_SECTIONS.map((section) => section.id));
    for (const row of OFFICIAL_ROWS) {
      if (row.section === null) continue;
      expect(ids.has(row.section), `${row.label} → ${row.section}`).toBe(true);
      expect(tabOfSection(row.section)).toBe(row.tab);
    }
  });

  it('leaves exactly the rows the official panel renders without a section heading', () => {
    expect(tabOfSection(null)).toBe('document');
    const unsectioned = (tab: string) =>
      OFFICIAL_ROWS.filter((row) => row.tab === tab && row.section === null).map((row) => row.label);
    expect(unsectioned('general')).toEqual(['取消', '查看所有快捷键']);
    expect(unsectioned('document')).toEqual(['每日笔记', '全选', '选择到顶部', '选择到底部']);
    expect(unsectioned('editing')).toEqual(['查找', '查找和替换']);
    for (const tab of ['tasks', 'style', 'organize', 'collections']) {
      expect(unsectioned(tab), tab).toEqual([]);
    }
  });
});

describe('panelRoster 装配', () => {
  const view = panelRoster('win');

  it('emits 89 official rows plus the four local-only bindings, with unique ids', () => {
    const rows = view.flatMap((entry) => [
      ...entry.unsectioned,
      ...entry.sections.flatMap((section) => section.rows),
    ]);
    expect(rows.filter((row) => row.official)).toHaveLength(89);
    expect(rows.filter((row) => !row.official).map((row) => row.id).sort()).toEqual([
      'l-MOVE_BLOCK_BOTTOM_MAC',
      'l-MOVE_BLOCK_TOP_MAC',
      'l-SET_CANCELLED_SLASH',
      'l-TOGGLE_QUICK_OPEN_SAFARI',
    ]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(rows).toHaveLength(93);
    // 名册没覆盖的本地绑定少一条，就说明有本地键从面板上消失了。
    const consumed = new Set(
      OFFICIAL_ROWS.flatMap((row) => [row.bound, row.alt?.bound])
        .filter((id): id is string => Boolean(id) && !OFFICIAL_WIRING.has(id!)),
    );
    const leftovers = KEY_BINDINGS.filter((binding) => !consumed.has(binding.id)).map((binding) => binding.id);
    expect(leftovers.sort()).toEqual([
      'MOVE_BLOCK_BOTTOM_MAC',
      'MOVE_BLOCK_TOP_MAC',
      'SET_CANCELLED_SLASH',
      'TOGGLE_QUICK_OPEN_SAFARI',
    ]);
  });

  it('flags the 31 official rows this build does not wire up', () => {
    const rows = view.flatMap((entry) => [
      ...entry.unsectioned,
      ...entry.sections.flatMap((section) => section.rows),
    ]);
    const unbound = rows.filter((row) => row.official && row.unbound);
    expect(unbound).toHaveLength(31);
    for (const row of unbound) expect(row.emptyTag, row.label).toBe('未接入');
    // 绑定的行走本机键帽，未绑定的行走官方键帽（置灰展示的那串）。
    const nav = rows.find((row) => row.id === 'o-general-2');
    expect(nav?.label).toBe('导航到');
    expect(nav?.caps).toEqual(['Ctrl', '→']);
    const sidebar = rows.find((row) => row.id === 'o-general-6');
    expect(sidebar?.caps).toEqual(['Ctrl', '\\']);
  });

  it('splits the sections the official panel prints, in collected order', () => {
    const editing = view.find((entry) => entry.tab.id === 'editing')!;
    expect(editing.sections.map((section) => section.section.title)).toEqual([
      '插入新区块',
      '编辑选择',
      '评论',
      '在查找和替换中',
      '其他',
    ]);
    const insert = editing.sections.find((section) => section.section.id === 'editing-insert')!;
    expect(insert.rows.map((row) => row.label)).toEqual(['在下方插入新区块', '在上方插入新区块']);
    const selection = editing.sections.find((section) => section.section.id === 'editing-selection')!;
    expect(selection.rows.map((row) => row.label)).toEqual([
      '编辑文本区块',
      '编辑页面区块',
      '创建副本',
      '打开斜线菜单',
    ]);
  });

  it('renders the alias rows right under their main row', () => {
    const general = view.find((entry) => entry.tab.id === 'general')!;
    const quick = general.unsectioned.concat(general.sections.flatMap((section) => section.rows))
      .find((row) => row.label === '快速开启')!;
    expect(quick.caps).toEqual(['Ctrl', 'O']);
    expect(quick.alt?.caps).toEqual(['Ctrl', 'P']);
    expect(quick.alt?.unbound).toBe(false);
    const code = view.find((entry) => entry.tab.id === 'style')!.sections
      .find((section) => section.section.id === 'style-format')!.rows.find((row) => row.label === '代码')!;
    expect(code.alt?.unbound).toBe(true);
  });
});
