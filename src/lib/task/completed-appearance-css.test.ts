import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` G160 —— 正文里那半边的 CSS 口径闸。
 *
 * 这个文件存在的理由是一次真实翻车：第一版把两条覆盖规则写在 `.tiptap { … }` 母块**里面**，
 * 编译出来是 `.tiptap [data-completed-appearance=…] .task-list-item…` —— 要求偏好属性挂在
 * `.tiptap` 的**后代**上。可属性就挂在 `.tiptap` 自己身上，于是选择器永不匹配，`none`/`faded`
 * 在正文里**静默无效**（页面不报错、单测也全绿，只有真浏览器探针能看见）。这里把「必须是
 * `.tiptap[...]` 前缀、不许是后代写法」钉成断言，防止再退回去。
 */
const css = readFileSync(path.resolve('src/app/globals.css'), 'utf8');

/** 「属性挂在祖先、却被当成后代去找」的选择器形态。 */
const DESCENDANT_FORM = /(^|[^.\w])\[data-completed-appearance=[^\]]+\]\s+\.task-list-item/g;

describe('完成任务的外观：正文 CSS 选择器口径（G160）', () => {
  it('基线规则在场（否则下面的覆盖没有意义，闸会空转）', () => {
    expect(css).toContain('.task-list-item[data-checked="true"] > div > p');
  });

  it('两档覆盖都以 `.tiptap[...]` 自身为前缀，而不是把属性当后代找', () => {
    for (const mode of ['faded', 'none']) {
      expect(css).toContain(`.tiptap[data-completed-appearance='${mode}'] .task-list-item[data-checked='true'] > div > p`);
    }
  });

  it('不存在「属性当后代」的旧写法（那正是静默失效的形态）', () => {
    // 形如 `[data-completed-appearance=…] .task-list-item`（前缀不是 `.tiptap[`）一律算违规。
    expect(css.match(DESCENDANT_FORM)).toBeNull();
  });

  it('该正则对旧写法确实报警（否则上面那条断言是空转）', () => {
    const bad = "  [data-completed-appearance='none'] .task-list-item[data-checked='true'] > div > p {\n    text-decoration: none;\n  }";
    expect(bad.match(DESCENDANT_FORM)).not.toBeNull();
    // 而正确的写法不该被它误伤
    const good = ".tiptap[data-completed-appearance='none'] .task-list-item[data-checked='true'] > div > p { }";
    expect(good.match(DESCENDANT_FORM)).toBeNull();
  });
});
