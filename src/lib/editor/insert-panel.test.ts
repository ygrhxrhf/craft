import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  INSERT_SUBVIEW_IDS,
  INSERT_SUBVIEW_LABELS,
  MARKDOWN_SHORTCUTS,
  MARKDOWN_SHORTCUTS_KEY,
  MARKDOWN_SHORTCUTS_TITLE,
} from './insert-panel';

/**
 * G67：官方插入面板有两个子视图（`插入` / `快捷方式`），后者是 Markdown 静小抄
 * （`blockdetails.sidebar.insert.shortcuts` + `blockdetails.shortcuts.markdown`）。本地此前只有一档。
 */
describe('the insert panel sub-views', () => {
  it('has exactly the two official views, in order', () => {
    expect([...INSERT_SUBVIEW_IDS]).toEqual(['insert', 'shortcuts']);
    expect(INSERT_SUBVIEW_LABELS.insert).toBe('插入');
    expect(INSERT_SUBVIEW_LABELS.shortcuts).toBe('快捷方式');
  });

  it('keeps the cheat-sheet heading and its key verbatim', () => {
    expect(MARKDOWN_SHORTCUTS_TITLE).toBe('Markdown 快捷方式');
    expect(MARKDOWN_SHORTCUTS_KEY).toBe('blockdetails.shortcuts.markdown');
  });
});

/**
 * 小抄只列**本地真的会触发**的规则——与快捷键面板同一条口径：写一条编辑器不实现的规则，
 * 用户一敲就是谎言。本测试把表钉在 `markdown-shortcuts.ts` 的输入规则数量上。
 */
describe('the cheat-sheet lists the rules this build actually fires', () => {
  it('has one row per input rule in the extension', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/editor/extensions/markdown-shortcuts.ts'),
      'utf8',
    );
    const rules = source.match(/find:\s*\//g) ?? [];
    expect(rules.length).toBe(6);
    expect(MARKDOWN_SHORTCUTS.length).toBe(rules.length);
  });

  it('covers strikethrough, highlight, link, both formulas and the task box', () => {
    const labels = MARKDOWN_SHORTCUTS.map((row) => row.label);
    expect(labels).toEqual(['删除线', '高亮', '链接', '块级公式', '行内公式', '待办事项']);
  });
});
