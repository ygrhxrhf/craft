import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `gap.md` G1382/G1383 —— 主题层的两条 CSS 口径。
 *
 * G1382：主题是运行期 effect 写进 `<html>` 的，首帧到 effect 之间既没有 `.dark` 也没有
 * `.light`；官方用一条 `prefers-color-scheme: dark` 的字面色兜底盖住那个窗口。缺了它，
 * 暗色用户在每次加载时都会看到一帧白屏。
 *
 * G1383：卡片底是**独立** token（`--card-background`），不是浮层 token 的别名；它随主题
 * 重指，且允许被外壳/专注模式覆盖。
 */
const css = readFileSync(path.resolve('src/app/globals.css'), 'utf8');

describe('主题层 CSS 口径（G1382/G1383）', () => {
  it('给未打标状态一条暗色兜底规则', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain('html:not(.dark):not(.light)');
  });

  it('兜底规则里带字面色，不是只声明 color-scheme', () => {
    const at = css.indexOf('html:not(.dark):not(.light)');
    expect(at).toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf('}', at));
    expect(block).toContain('background-color:');
    expect(block).toContain('oklch(');
  });

  it('卡片底是独立声明的 token，且在暗档重指', () => {
    const declarations = css.match(/--card-background:\s*[^;]+;/g) ?? [];
    expect(declarations.length).toBeGreaterThanOrEqual(2);
  });

  it('亮档根上声明 color-scheme，允许系统接管未打标状态', () => {
    const rootAt = css.indexOf(':root {');
    const block = css.slice(rootAt, css.indexOf('}', rootAt));
    expect(block).toContain('color-scheme: light dark');
  });
});
