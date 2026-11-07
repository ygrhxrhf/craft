import type { CodeThemeSurface } from './code-themes';

/**
 * G1161 —— 官方代码面的 `.cm-activeLineGutter` 有**两个来源不同的键**：
 *
 *   - 底色来自 `lineHighlight`（不是独立的 `gutterActive*` 键）；
 *   - 前景来自 `gutterActiveForeground`。
 *
 * 其中任一缺失就只产出另一条声明；两个都缺（`githublight`）时官方生成的是一条**空规则**
 * `".cm-activeLineGutter": {}` ⇒ 该选择器不产出任何声明，活跃行的行号既不换色也不换底。
 * 本模块把这三态落成「样式对象」：缺的键不出现，两个都缺时是 `{}`。
 */
export type ActiveLineGutterStyle = { backgroundColor?: string; color?: string };

export function activeLineGutterStyle(
  surface: Pick<CodeThemeSurface, 'lineHighlight' | 'gutterActiveForeground'>,
): ActiveLineGutterStyle {
  const style: ActiveLineGutterStyle = {};
  if (surface.lineHighlight) style.backgroundColor = surface.lineHighlight;
  if (surface.gutterActiveForeground) style.color = surface.gutterActiveForeground;
  return style;
}

/**
 * 光标在代码块文本里的第几行（0 起）。空块、负数、非有限数一律读作第 0 行——行号槽在空块上
 * 也有一行（G1176），活跃行不能因此落到「没有」。
 */
export function activeLineIndex(text: string, offset: number): number {
  if (!Number.isFinite(offset) || offset <= 0) return 0;
  const clamped = Math.min(Math.trunc(offset), text.length);
  return text.slice(0, clamped).split('\n').length - 1;
}

/**
 * 光标落在某个节点内时，把文档坐标换成节点内的文本偏移；落在节点外返回 `null`。
 * `nodeStart` 是节点的开位置（`getPos()`），内容从下一格开始。
 */
export function caretOffsetInNode(
  head: number,
  nodeStart: number,
  contentSize: number,
): number | null {
  const offset = head - (nodeStart + 1);
  if (offset < 0 || offset > contentSize) return null;
  return offset;
}