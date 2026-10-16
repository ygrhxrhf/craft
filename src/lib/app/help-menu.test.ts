import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  HELP_CENTER_MARKDOWN_PATH,
  HELP_ENTRIES,
  helpEntry,
  helpEntryUrl,
  opensInApp,
} from './help-menu';

/**
 * The help menu (G754). Six entries; the shortcuts one opens an in-app panel, while the Markdown
 * one leaves the app for the help centre.
 */
describe('the six entries', () => {
  it('has all six, in the collected order', () => {
    expect(HELP_ENTRIES.map((e) => e.label)).toEqual([
      '意见反馈',
      '最新特性',
      'Web 和 Windows 版最新特性',
      '常见问题',
      '快捷键',
      'Markdown 快捷方式',
    ]);
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
 * G765 把六项落点逐字读了出来（拦截 `window.open`）。外链三枚记全，菜单才不必自己猜 URL。
 */
describe('the landing targets', () => {
  it('carries the three official external URLs, verbatim', () => {
    expect(helpEntryUrl('whatsNew')).toBe('https://www.craft.do/whats-new');
    expect(helpEntryUrl('whatsNewWebWindows')).toBe('https://www.craft.do/whats-new-web-windows');
    expect(helpEntryUrl('faq')).toBe('https://support.craft.do');
  });

  it('completes the bare help-centre path with a scheme', () => {
    expect(helpEntryUrl('markdownShortcuts')).toBe(
      'https://support.craft.do/zh-Hans/write-and-edit/formatting/markdown-shortcuts',
    );
  });

  it('returns null for entries that do not leave the app', () => {
    expect(helpEntryUrl('shortcuts')).toBeNull();
    expect(helpEntryUrl('feedback')).toBeNull();
    expect(helpEntryUrl('nope')).toBeNull();
  });
});

/**
 * G754：菜单此前**有模型没入口**（`HELP_ENTRIES` 零消费者）⇒「Markdown 快捷方式」这份对照表
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

  it('maps every entry through the model rather than hard-coding labels', () => {
    expect(source).toContain('HELP_ENTRIES');
    expect(source).toContain('helpEntryUrl');
    expect(source).not.toContain('Markdown 快捷方式');
  });

  it('opens external links with noopener, like the official closures', () => {
    expect(source).toContain("'noopener,noreferrer'");
  });

  it('is mounted in the sidebar footer', () => {
    expect(footer).toContain('HelpMenu');
  });
});
