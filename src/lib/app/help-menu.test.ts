import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  HELP_CENTER_MARKDOWN_PATH,
  HELP_ENTRIES,
  SYNC_STATUS_LABEL,
  helpEntriesFor,
  helpEntry,
  helpEntryUrl,
  opensInApp,
  syncStatusText,
} from './help-menu';

/**
 * The full roster (G950): eight rows in the official order. Which of them the menu lists depends on
 * the viewport tier and on whether a document is open — see the gating block below.
 */
describe('the eight entries', () => {
  it('has all eight, in the collected official order', () => {
    expect(HELP_ENTRIES.map((e) => e.label)).toEqual([
      SYNC_STATUS_LABEL,
      '报告同步',
      '意见反馈',
      '最新特性',
      'Web 和 Windows 版最新特性',
      '常见问题',
      '快捷键',
      'Markdown 快捷方式',
    ]);
  });

  it('keeps the Sync Status row untranslated, per the official i18n gap', () => {
    expect(SYNC_STATUS_LABEL).toBe('Sync Status');
  });

  it('opens the shortcuts entry as an in-app panel', () => {
    expect(helpEntry('shortcuts')?.kind).toBe('inAppPanel');
    expect(opensInApp('shortcuts')).toBe(true);
  });

  it('sends the Markdown entry to the help centre rather than a panel', () => {
    const entry = helpEntry('markdownShortcuts');
    expect(entry?.kind).toBe('externalLink');
    // href 带协议（G765 记的落点），路径部分仍是 HELP_CENTER_MARKDOWN_PATH。
    expect(entry?.href).toBe(`https://${HELP_CENTER_MARKDOWN_PATH}`);
    expect(opensInApp('markdownShortcuts')).toBe(false);
  });

  it('keeps the help centre path verbatim', () => {
    expect(HELP_CENTER_MARKDOWN_PATH).toBe(
      'support.craft.do/zh-Hans/write-and-edit/formatting/markdown-shortcuts',
    );
  });

  it('returns null for an unknown id', () => {
    expect(helpEntry('nope')).toBeNull();
  });
});

/**
 * G765 把落点逐字读了出来（拦截 `window.open`）。外链记全，菜单才不必自己猜 URL。
 */
describe('the landing targets', () => {
  it('carries the official external URLs, verbatim', () => {
    expect(helpEntryUrl('whatsNew')).toBe('https://www.craft.do/whats-new');
    expect(helpEntryUrl('whatsNewWebWindows')).toBe('https://www.craft.do/whats-new-web-windows');
    expect(helpEntryUrl('faq')).toBe('https://support.craft.do');
    // 「报告同步」官方只记到"点它会走外链通路"，落点未采 ⇒ 本地落帮助站根。
    expect(helpEntryUrl('reportSync')).toBe('https://support.craft.do');
  });

  it('completes the bare help-centre path with a scheme', () => {
    expect(helpEntryUrl('markdownShortcuts')).toBe(
      'https://support.craft.do/zh-Hans/write-and-edit/formatting/markdown-shortcuts',
    );
  });

  it('returns null for entries that do not leave the app', () => {
    expect(helpEntryUrl('syncStatus')).toBeNull();
    expect(helpEntryUrl('shortcuts')).toBeNull();
    expect(helpEntryUrl('feedback')).toBeNull();
    expect(helpEntryUrl('nope')).toBeNull();
  });
});

/**
 * G877 / G883 / G891 / G950：三次读数互不矛盾——条目集由「档位＋页面态」决定：
 *   桌面文档页 8 项（含 `Sync Status` 与「报告同步」）；桌面空间页 6 项；compact 5 项（再丢「快捷键」）。
 */
describe('viewport and page-state gating', () => {
  it('lists eight on the desktop document page', () => {
    expect(helpEntriesFor({ compact: false, documentPage: true }).map((e) => e.id)).toEqual([
      'syncStatus',
      'reportSync',
      'feedback',
      'whatsNew',
      'whatsNewWebWindows',
      'faq',
      'shortcuts',
      'markdownShortcuts',
    ]);
  });

  it('lists six on the desktop space page — the two sync rows drop out', () => {
    expect(helpEntriesFor({ compact: false, documentPage: false }).map((e) => e.id)).toEqual([
      'feedback',
      'whatsNew',
      'whatsNewWebWindows',
      'faq',
      'shortcuts',
      'markdownShortcuts',
    ]);
  });

  it('lists five in compact — 快捷键 drops out as well', () => {
    expect(helpEntriesFor({ compact: true, documentPage: true }).map((e) => e.id)).toEqual([
      'feedback',
      'whatsNew',
      'whatsNewWebWindows',
      'faq',
      'markdownShortcuts',
    ]);
    expect(helpEntriesFor({ compact: true, documentPage: false })).toHaveLength(5);
  });

  it('shows `All changes synced` for the synced state, like the screen reading', () => {
    expect(syncStatusText('synced')).toBe('All changes synced');
    expect(syncStatusText('syncing')).toBe('同步中…');
    expect(syncStatusText('offline')).toBe('离线');
  });
});

/**
 * G754/G950：菜单此前**有模型没入口**（`HELP_ENTRIES` 零消费者）⇒「Markdown 快捷方式」这份对照表
 * 用户根本看不到。钉住接线。
 */
describe('the menu is actually rendered', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/app/HelpMenu.tsx'),
    'utf8',
  );
  const footer = readFileSync(
    join(process.cwd(), 'src/components/sidebar/SidebarFooter.tsx'),
    'utf8',
  );

  it('maps entries through the model rather than hard-coding labels', () => {
    expect(source).toContain('helpEntriesFor');
    expect(source).toContain('helpEntryUrl');
    // 渲染体里不许出现标号字面量（注释里点到名字不算）——label 全部从模型来。
    expect(source).not.toContain("'Markdown 快捷方式'");
  });

  it('renders the sync status row from the live manager', () => {
    expect(source).toContain('SYNC_STATUS_LABEL');
    expect(source).toContain('syncStatusText');
    expect(source).toContain('getSyncManager');
  });

  it('opens external links with noopener, like the official closures', () => {
    expect(source).toContain("'noopener,noreferrer'");
  });

  it('is mounted in the sidebar footer', () => {
    expect(footer).toContain('HelpMenu');
  });
});
