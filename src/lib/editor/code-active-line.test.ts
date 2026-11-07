import { describe, expect, it } from 'vitest';

import { CRAFTDARK, CRAFTLIGHT, CODE_THEMES } from './code-themes';
import { activeLineGutterStyle, activeLineIndex, caretOffsetInNode } from './code-active-line';

const surfaceOf = (id: string) => {
  const theme = CODE_THEMES.find((candidate) => candidate.id === id);
  if (!theme || !theme.surface) throw new Error(`no theme ${id}`);
  return theme.surface;
};

/** G1161：活跃行行号槽的底色来自 `lineHighlight`、前景来自 `gutterActiveForeground`。 */
describe('the active line gutter', () => {
  it('takes its background from lineHighlight and its colour from gutterActiveForeground', () => {
    expect(activeLineGutterStyle(CRAFTLIGHT)).toEqual({
      backgroundColor: CRAFTLIGHT.lineHighlight,
      color: CRAFTLIGHT.gutterActiveForeground,
    });
  });

  it('omits a key the palette never declared', () => {
    expect(activeLineGutterStyle({ lineHighlight: 'rgba(0,0,0,0.03)' })).toEqual({
      backgroundColor: 'rgba(0,0,0,0.03)',
    });
    expect(activeLineGutterStyle({ gutterActiveForeground: '#fff' })).toEqual({ color: '#fff' });
  });

  it('produces an empty rule for githublight, whose two keys are both missing', () => {
    // 官方给这个主题生成的正是 `".cm-activeLineGutter": {}`：一行声明都不产出。
    expect(activeLineGutterStyle(surfaceOf('githublight'))).toEqual({});
    // 十八个第三方主题的两个键都没采到 ⇒ 同一档空规则（不是拿邻居的颜色补）。
    expect(activeLineGutterStyle(surfaceOf('nord'))).toEqual({});
    expect(CRAFTDARK.lineHighlight).toBeTruthy();
  });
});

describe('the caret line inside a code block', () => {
  const text = 'a = 1\nb = 2\nc = 3';

  it('counts newlines before the caret', () => {
    expect(activeLineIndex(text, 0)).toBe(0);
    expect(activeLineIndex(text, 4)).toBe(0);
    expect(activeLineIndex(text, 6)).toBe(1);
    expect(activeLineIndex(text, text.length)).toBe(2);
  });

  it('an empty block still has a first line', () => {
    expect(activeLineIndex('', 0)).toBe(0);
    expect(activeLineIndex(text, Number.NaN)).toBe(0);
  });

  it('maps a document position onto the node\u2019s own text offset', () => {
    // Node opens at 10 ⇒ its content starts at 11.
    expect(caretOffsetInNode(11, 10, 5)).toBe(0);
    expect(caretOffsetInNode(14, 10, 5)).toBe(3);
    expect(caretOffsetInNode(10, 10, 5)).toBeNull();
    expect(caretOffsetInNode(16, 10, 5)).toBe(5);
    expect(caretOffsetInNode(17, 10, 5)).toBeNull();
  });
});