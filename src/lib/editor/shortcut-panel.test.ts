import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BINDING_SECTIONS,
  PANEL_SECTIONS,
  PANEL_TABS,
  nextTabIndex,
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
  it('only names sections that exist', () => {
    const ids = new Set<string>(PANEL_SECTIONS.map((section) => section.id));
    for (const [id, section] of Object.entries(BINDING_SECTIONS)) {
      if (section === null) continue;
      expect(ids.has(section), id).toBe(true);
    }
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

  // G939：官方是 document 级捕获监听——只在没被更深层拦下、非 IME、非嵌套弹层、
  // 非可编辑目标时推进选中；不 preventDefault（页面滚动照旧）、不挪焦点、只认 ↑/↓。
  it('wires the arrows via a document-capture listener that never moves focus', () => {
    const panel = readFileSync(join(process.cwd(), 'src/components/settings/ShortcutsPanel.tsx'), 'utf8');
    expect(panel).toContain("document.addEventListener('keydown', onKeyDown, true)");
    expect(panel).toContain('if (event.defaultPrevented) return;');
    expect(panel).toContain('if (isImeComposing(event)) return;');
    expect(panel).toContain('if (eventInNestedPopup(event.target)) return;');
    expect(panel).toContain('if (isEditableTarget(event.target)) return;');
    expect(panel).toContain("event.key !== 'ArrowDown' && event.key !== 'ArrowUp'");
    expect(panel).toContain('setActive((current) => nextTabIndex(');
    const start = panel.indexOf('const onKeyDown = (event: KeyboardEvent)');
    const body = panel.slice(start, panel.indexOf('const rail ='));
    expect(start).toBeGreaterThan(0);
    expect(body).not.toContain('event.preventDefault()');
    expect(body).not.toContain('.focus(');
    expect(body).not.toContain('tabIndex');
  });

  it('leaves the buttons native, so Space follows focus on keyup', () => {
    const panel = readFileSync(join(process.cwd(), 'src/components/settings/ShortcutsPanel.tsx'), 'utf8');
    // 原生 <button>：Space 在 keyup 合成 click、点击焦点所在项（G782/G789 的语义来自原生，
    // 本地只要**不拦**这两个键就是对的）。
    expect(panel).toContain('<button');
    const start = panel.indexOf('const onKeyDown = (event: KeyboardEvent)');
    const body = panel.slice(start, panel.indexOf('const rail ='));
    expect(body).not.toContain("'Space'");
    expect(body).not.toContain('ArrowLeft');
  });

  // G752：面板一打开焦点就落进第一枚分类按钮——焦点在哪决定 Esc 归谁（焦点在面板里，
  // 全局焦点栈的栈顶就是面板 ⇒ 只关面板、下面的帮助菜单原样留着）。
  it('takes focus into the first category as soon as the panel opens', () => {
    const panel = readFileSync(join(process.cwd(), 'src/components/settings/ShortcutsPanel.tsx'), 'utf8');
    expect(panel).toContain('firstCategoryRef.current?.focus()');
    expect(panel).toContain('ref={tab.id === PANEL_TABS[0].id ? firstCategoryRef : undefined}');
    expect(panel).toContain('useEffect(() => {');
  });
});
