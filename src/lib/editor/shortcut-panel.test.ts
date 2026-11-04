import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { KEY_BINDINGS } from './keymap';
import {
  BINDING_SECTIONS,
  PANEL_SECTIONS,
  PANEL_TABS,
  nextTabIndex,
  panelView,
  tabOfSection,
  type PanelTabId,
} from './shortcut-panel';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function ledgerValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  if (!line) return null;
  const match = /^-\s+(.+?)\s+`/.exec(line.trim());
  return match ? match[1] : null;
}

describe('the panel taxonomy (G755 / G771 / G1622)', () => {
  it('offers the seven tabs in the collected order', () => {
    expect(PANEL_TABS.map((tab) => tab.label)).toEqual(['通用', '文档', '任务', '编辑', '样式', '整理', '合集']);
  });

  it('holds the eighteen sections the panel source names', () => {
    expect(PANEL_SECTIONS).toHaveLength(18);
    expect(PANEL_SECTIONS.map((section) => section.id)).toEqual([
      'general-navigation',
      'general-view',
      'tasks-global',
      'tasks-views',
      'editing-insert',
      'editing-selection',
      'editing-comments',
      'editing-find-replace',
      'editing-other',
      'style-text',
      'style-list',
      'style-decorations',
      'style-indentation',
      'style-format',
      'organize-move',
      'organize-group',
      'collections-tables',
      'collections-collections',
    ]);
    // 「文档」是唯一没有段标题的分类。
    expect(PANEL_SECTIONS.filter((section) => section.tab === 'document')).toHaveLength(0);
  });

  it('takes every section title from the catalog', () => {
    for (const section of PANEL_SECTIONS) {
      expect(ledgerValue(section.key), section.key).toBe(section.title);
    }
  });

  it('takes the tab labels that do have a key from the catalog', () => {
    for (const tab of PANEL_TABS) {
      if (!tab.key) continue;
      expect(ledgerValue(tab.key), tab.key).toBe(tab.label);
    }
  });
});

describe('how local bindings fold into it', () => {
  it('places every local binding, so nothing disappears from the panel', () => {
    const unplaced = KEY_BINDINGS.filter((binding) => !(binding.id in BINDING_SECTIONS));
    expect(unplaced.map((binding) => binding.id)).toEqual([]);
  });

  it('only names sections that exist', () => {
    const ids = new Set<string>(PANEL_SECTIONS.map((section) => section.id));
    for (const [id, section] of Object.entries(BINDING_SECTIONS)) {
      if (section === null) continue;
      expect(ids.has(section), id).toBe(true);
    }
  });

  it('keeps 文档 unsectioned and the rest under their tab', () => {
    expect(tabOfSection(null)).toBe('document');
    expect(tabOfSection('style-list')).toBe('style');
    const view = panelView(KEY_BINDINGS);
    const byId = new Map(view.map((entry) => [entry.tab.id, entry]));
    expect(byId.get('document')?.sections).toHaveLength(0);
    expect(byId.get('document')?.unsectioned.map((binding) => binding.id)).toEqual(['OPEN_DAILY_NOTE']);
    // 每一行都被某个分类接走。
    const total = view.reduce(
      (sum, entry) => sum + entry.unsectioned.length + entry.sections.reduce((n, s) => n + s.rows.length, 0),
      0,
    );
    expect(total).toBe(KEY_BINDINGS.length);
  });

  it('prints sections in the collected order inside a tab', () => {
    const editing = panelView(KEY_BINDINGS).find((entry) => entry.tab.id === 'editing');
    expect(editing?.sections.map((section) => section.title)).toEqual([
      '插入新区块',
      '编辑选择',
      '评论',
      '在查找和替换中',
      '其他',
    ]);
    expect(editing?.sections.find((section) => section.id === 'editing-selection')?.rows.map((r) => r.label))
      .toEqual(['创建副本', '编辑页面区块']);
  });
});

/**
 * G784/G782/G789 —— 分类 rail 的三态：选中跟随 Arrow、焦点不跟（官方没有 roving tabindex）、
 * 激活跟随焦点（原生 button 在 keyup 当帧合成 click，那两条不用自写）。
 */
describe('the shortcuts rail navigation (G784/G782/G789)', () => {
  it('moves the selection with the arrows and clamps at both ends', () => {
    expect(nextTabIndex(PANEL_TABS[0].id, -1)).toBe(PANEL_TABS[0].id);
    expect(nextTabIndex(PANEL_TABS[0].id, 1)).toBe(PANEL_TABS[1].id);
    const last = PANEL_TABS[PANEL_TABS.length - 1];
    expect(nextTabIndex(last.id, 1)).toBe(last.id);
    expect(nextTabIndex(last.id, -1)).toBe(PANEL_TABS[PANEL_TABS.length - 2].id);
    expect(nextTabIndex('not-a-tab' as PanelTabId, 1)).toBe(PANEL_TABS[0].id);
  });

  it('wires the arrows onto the rail without ever moving focus', () => {
    const panel = readFileSync(join(process.cwd(), 'src/components/settings/ShortcutsPanel.tsx'), 'utf8');
    expect(panel).toContain('onKeyDown={onRailKeyDown}');
    expect(panel).toContain("event.key !== 'ArrowDown' && event.key !== 'ArrowUp'");
    expect(panel).toContain('event.preventDefault()');
    expect(panel).toContain('setActive((current) => nextTabIndex(');
    const start = panel.indexOf('const onRailKeyDown');
    const body = panel.slice(start, panel.indexOf('const rail ='));
    // 没有 roving tabindex：方向键那条通路里不许出现 focus()/tabIndex
    expect(start).toBeGreaterThan(0);
    expect(body).not.toContain('.focus(');
    expect(body).not.toContain('tabIndex');
  });

  it('leaves the buttons native, so Space follows focus on keyup', () => {
    const panel = readFileSync(join(process.cwd(), 'src/components/settings/ShortcutsPanel.tsx'), 'utf8');
    // 原生 <button>：Space 在 keyup 合成 click、点击焦点所在项（G782/G789 的语义来自原生，
    // 本地只要**不拦**这两个键就是对的）。
    expect(panel).toContain('<button');
    const start = panel.indexOf('const onRailKeyDown');
    const body = panel.slice(start, panel.indexOf('const rail ='));
    expect(body).not.toContain("'Space'");
    expect(body).not.toContain('ArrowLeft');
  });
});
