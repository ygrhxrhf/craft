import { describe, expect, it } from 'vitest';

import {
  HELP_CENTER_MARKDOWN_PATH,
  HELP_ENTRIES,
  helpEntry,
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
    expect(entry?.href).toBe(HELP_CENTER_MARKDOWN_PATH);
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
